// TypeScript 5.7+ made Uint8Array generic (Uint8Array<ArrayBufferLike>), but the
// DOM Web Crypto API types still require BufferSource = ArrayBufferView<ArrayBuffer>.
// This shim widens BufferSource so Uint8Array<ArrayBufferLike> is accepted, matching
// actual browser runtime behaviour where both are valid.
declare type BufferSource = ArrayBufferView<ArrayBufferLike> | ArrayBuffer;
