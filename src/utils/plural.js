/** "1 order", "3 orders". Pass the plural form when it is not just word + "s". */
export const plural = (count, one, many = `${one}s`) => `${count ?? 0} ${count === 1 ? one : many}`;
