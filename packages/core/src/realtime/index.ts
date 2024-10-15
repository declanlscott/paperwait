export namespace Realtime {
  export function formatChannel(prefix: string, id: string) {
    return `${prefix}_${id}`;
  }

  export type Channel = ReturnType<typeof formatChannel>;
}
