export class Cast {
  static number(num): number {
    if (num === undefined) return undefined;
    if (num === null) return null;

    return parseFloat(num);
  }

  static integer(num): number {
    if (num === undefined) return undefined;
    if (num === null) return null;

    return parseInt(num, 10);
  }

  static date(d): Date {
    if (d === undefined) return undefined;
    if (d === null) return null;

    if (d instanceof Date) return d;

    return new Date(d);
  }

  static array(arr): any[] {
    if (arr === undefined) return undefined;
    if (arr === null) return null;

    if (Array.isArray(arr)) {
      return arr;
    }

    console.warn("expected an array found:", arr);
    return [];
  }

  static boolean(b): boolean {
    if (b === undefined) return undefined;
    if (b === null) return null;

    return b === true;
  }

  static string(str): string {
    if (str === undefined) return undefined;
    if (str === null) return null;

    return "" + str;
  }
}
