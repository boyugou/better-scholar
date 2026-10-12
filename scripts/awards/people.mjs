// Is this one person's name? For the award readers that must tell a list of authors from the end of a title ("… vs. Rollups. Jo Yan").
// Two to five words, each a capitalised word, an initial ("M.", "J.C", "T-H.", "C.-H.", "Iu.") or a name particle; no colon, question mark or digit.
// A word that ends in a full stop and is longer than an initial ("Rollups.") is the end of a title, not part of a name.
const PARTICLE = /^(?:van|von|der|den|de|del|della|di|da|dos|du|la|le|bin|ibn|al|el|ter|ten|te)$/;

export function isPerson(n) {
  const t = n.replace(/\s+/g, " ").trim().split(" ");
  return t.length >= 2 && t.length <= 5 && !/[:?!0-9]/.test(n) &&
    t.every((w, i) => /^\p{Lu}[\p{L}'’-]*$/u.test(w) || /^\p{Lu}(?:\.?-?\p{Lu})*\.?$/u.test(w) || /^\p{Lu}\p{Ll}\.$/u.test(w) || (i > 0 && PARTICLE.test(w)));
}
