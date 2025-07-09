declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    algorithm?: string;
    issuer?: string;
    jwtid?: string;
    subject?: string;
    noTimestamp?: boolean;
    header?: object;
    keyid?: string;
  }

  export interface JwtPayload {
    [key: string]: any;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    clockTimestamp?: number;
    clockTolerance?: number;
    complete?: boolean;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    nonce?: string;
    subject?: string;
    maxAge?: string | number;
  }

  export type Secret = string | Buffer;

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: Secret,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): JwtPayload | string;

  export function decode(
    token: string,
    options?: { complete?: boolean; json?: boolean }
  ): null | JwtPayload | string;
}