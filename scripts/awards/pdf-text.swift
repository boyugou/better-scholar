// Dump a PDF's text with macOS PDFKit: swift scripts/awards/pdf-text.swift file.pdf > file.txt (the award readers that take PDFs read this text).
import Foundation
import PDFKit
let a = CommandLine.arguments
guard a.count > 1, let d = PDFDocument(url: URL(fileURLWithPath: a[1])) else { exit(1) }
print(d.string ?? "")
