export class Cast {
  static number(num): number {
    return parseFloat(num);
  }
  static integer(num): number {
    return parseInt(num, 10);
  }

  static array(arr): any[] {
    if (Array.isArray(arr)) {
      return arr;
    }

    console.warn("expected an array found:", arr)
    return [];
  }

  static boolean(b): boolean {
    return b === true;
  }

  static string(str): string {
    return "" + str;
  }
}
