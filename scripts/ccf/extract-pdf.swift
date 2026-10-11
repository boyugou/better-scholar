// Dump every character of a PDF together with its bounding box, per page, as JSON.
//
//   swift scripts/ccf/extract-pdf.swift <in.pdf> <out.json>
//
// Why: the CCF catalogue PDF is a table whose cells PDFKit's plain-text output
// emits in a different order on every page (serial+abbr first, names later,
// publisher/URL columns elsewhere). The text layer is only trustworthy together
// with geometry, so scripts/ccf/build-ccf.mjs rebuilds the rows from these boxes.
//
// Geometry: two PDFKit APIs are combined, because neither is usable alone.
//
//  * PDFPage.characterBounds(at: j) gives tight *ink* boxes (exact vertical
//    position), but it is indexed over the page's glyph list, which does NOT
//    contain the newlines PDFKit synthesises into page.string. So index j is the
//    j-th NON-newline character of page.string, not string index i. (Indexing it
//    with i makes every box drift: "1" gets the box of "T".)
//  * PDFPage.selection(for: NSRange) + PDFSelection.bounds(for:) is indexed like
//    page.string and gives the character's advance box (exact left/right edges,
//    glyph boxes tile text without gaps), but its vertical extent is PDFKit's
//    line rectangle and is off by several points.
//
// Each character therefore carries: x/w from the selection (advance box) and
// y/h from characterBounds (ink box), joined on the alignment above. The alignment
// is verified per page (the ink box centre must lie inside the advance box) and
// reported as "alignMismatches"; build-ccf.mjs refuses to run if it is not ~0.
//
// Output (numbers rounded to 3 decimals, PDF user space, origin bottom-left):
//   {
//     "source": "<basename of the pdf>", "sha256": "<hex>", "pageCount": N,
//     "pages": [
//       { "page": 1, "width": W, "height": H, "rotation": 0, "alignMismatches": 0,
//         "chars": [ { "c": "A", "x": left, "w": advance, "y": inkBottom, "h": inkHeight, "n": 0|1 } ... ] },
//       ...
//     ]
//   }
// "n" is 1 for a synthetic newline (no glyph; its box is zero).
//
// The PDF is treated as untrusted data: PDFKit only parses and lays out the text
// layer here; nothing embedded in the document (JavaScript, actions, URLs) is run
// or followed, and no network access is performed.

import Foundation
import PDFKit
import CryptoKit

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count == 3 else {
    fail("usage: swift extract-pdf.swift <in.pdf> <out.json>")
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
guard let pdfData = try? Data(contentsOf: inURL) else { fail("cannot read PDF: \(args[1])") }
let sha256 = SHA256.hash(data: pdfData).map { String(format: "%02x", $0) }.joined()
guard let doc = PDFDocument(data: pdfData) else { fail("cannot open PDF: \(args[1])") }
if doc.isLocked { fail("PDF is encrypted/locked; cannot extract text") }

func r3(_ v: CGFloat) -> Double { (Double(v) * 1000).rounded() / 1000 }
func isNewline(_ u: unichar) -> Bool { u == 10 || u == 13 }
func isSpace(_ u: unichar) -> Bool { u == 32 || u == 9 || u == 0xA0 }

var pages: [[String: Any]] = []
var totalChars = 0
var totalNewlines = 0
var totalMismatch = 0

for pageIndex in 0..<doc.pageCount {
    guard let page = doc.page(at: pageIndex) else { fail("cannot read page \(pageIndex + 1)") }
    let media = page.bounds(for: .mediaBox)
    // PDFPage.string is indexed by UTF-16 code unit when used with NSRange.
    let text = (page.string ?? "") as NSString
    var chars: [[String: Any]] = []
    chars.reserveCapacity(text.length)
    var glyphIndex = 0          // index into characterBounds(at:): counts non-newline characters only
    var mismatches = 0

    var i = 0
    while i < text.length {
        let unit = text.character(at: i)
        var width = 1
        // Keep a surrogate pair together as one entry (it is one glyph).
        if unit >= 0xD800 && unit <= 0xDBFF && i + 1 < text.length {
            let next = text.character(at: i + 1)
            if next >= 0xDC00 && next <= 0xDFFF { width = 2 }
        }
        let range = NSRange(location: i, length: width)
        let s = text.substring(with: range)

        if width == 1 && isNewline(unit) {
            chars.append(["c": s, "x": 0.0, "w": 0.0, "y": 0.0, "h": 0.0, "n": 1])
            totalNewlines += 1
            i += width
            continue
        }

        let ink = page.characterBounds(at: glyphIndex)
        glyphIndex += width        // a surrogate pair is two string units; PDFKit counts both
        var adv = CGRect.zero
        if let sel = page.selection(for: range) { adv = sel.bounds(for: page) }

        // Alignment check (non-space glyphs only: PDFKit's boxes for spaces are zero-width/spanning).
        if !(width == 1 && isSpace(unit)) {
            let cx = ink.midX
            let inside = cx >= adv.minX - 1.0 && cx <= adv.maxX + 1.0
            let cy = ink.midY
            let insideY = cy >= adv.minY - 2.0 && cy <= adv.maxY + 2.0
            if !(inside && insideY) { mismatches += 1 }
        }

        chars.append([
            "c": s,
            "x": r3(adv.origin.x),
            "w": r3(adv.size.width),
            "y": r3(ink.origin.y),
            "h": r3(ink.size.height),
            "n": 0,
        ])
        i += width
    }

    totalChars += chars.count
    totalMismatch += mismatches
    pages.append([
        "page": pageIndex + 1,
        "width": r3(media.width),
        "height": r3(media.height),
        "rotation": page.rotation,
        "alignMismatches": mismatches,
        "chars": chars,
    ])
}

let root: [String: Any] = [
    "source": inURL.lastPathComponent,
    "sha256": sha256,
    "pageCount": doc.pageCount,
    "pages": pages,
]

do {
    let data = try JSONSerialization.data(withJSONObject: root, options: [.sortedKeys])
    try data.write(to: outURL, options: .atomic)
} catch {
    fail("cannot write \(args[2]): \(error)")
}
print("pages: \(doc.pageCount), chars: \(totalChars) (newlines: \(totalNewlines), alignment mismatches: \(totalMismatch)) sha256: \(sha256) -> \(args[2])")
