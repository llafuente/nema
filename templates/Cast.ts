export class Cast {
  static number(num): number {
    if (num === null) return null;

    return parseFloat(num);
  }
  static integer(num): number {
    if (num === null) return null;

    return parseInt(num, 10);
  }

  static array(arr): any[] {
    if (arr === null) return null;

    if (Array.isArray(arr)) {
      return arr;
    }

    console.warn("expected an array found:", arr)
    return [];
  }

  static boolean(b): boolean {
    if (b === null) return null;

    return b === true;
  }

  static string(str): string {
    if (str === null) return null;

    return "" + str;
  }
}
