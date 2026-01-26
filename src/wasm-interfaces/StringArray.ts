export const StringArrayInterface = {
  create_string_array(string: string): string[] {
    return [string];
  },
  push_to_string_array(array: string[], string: string) {
    array.push(string);
  },
};
