export function camelcase(str) {
  return str
    .replace(/\[.*\]/g, "")
    .toLowerCase()
    .replace(/[_.\- ]+(\w|$)/g, (m, p1) => p1.toUpperCase());
}
