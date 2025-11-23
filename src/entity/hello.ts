export class Hello {
  private _s: string

  get s(): string {
    return this._s
  }

  set s(value: string) {
    this._s = value
  }

  constructor(s: string) {
    this._s = s
  }
}
