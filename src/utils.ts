export function camelcase(str) {
  return str
    .replace(/\[.*\]/g, "")
    .toLowerCase()
    .replace(/[_.\- ]+(\w|$)/g, (m, p1) => p1.toUpperCase());
}

export function ksort(obj) {
  const ret = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      ret[k] = obj[k];
    });

  return ret;
}

export function uniquePush(arr: any[], str: any) {
  if (arr.indexOf(str) === -1) {
    arr.push(str);
  }
}
