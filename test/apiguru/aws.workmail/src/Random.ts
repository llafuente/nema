export class Random {
  static number(): number {
    return Math.floor(Math.random() * 1000000);
  }
  static integer(): number {
    return Random.number();
  }

  static enum(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  static array(): any[] {
    return [];
  }

  static boolean(): boolean {
    return Random.number() > 0.5;
  }

  static string(max: number = 16): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < max; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  }

  static ObjectId() {
    let text = "";
    const possible = "abcdef0123456789";

    for (let i = 0; i < 24; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  }
}
