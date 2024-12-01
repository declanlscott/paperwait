export namespace Utils {
  export function getUserInitials(name: string) {
    if (!name) return "";

    const splitName = name.split(" ");
    const firstInitial = splitName[0].charAt(0).toUpperCase();

    if (splitName.length === 1) return firstInitial;

    const lastInitial = splitName[splitName.length - 1].charAt(0).toUpperCase();

    return `${firstInitial}${lastInitial}`;
  }
}
