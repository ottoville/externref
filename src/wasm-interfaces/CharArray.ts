export const CharArrayInterface = {
  create_char_array(char: number): string[] {
    return [char.toString()];
  },
  push_to_char_array(array: string[], char: number) {
    array.push(char.toString());
  },
};
