export function assertRequestQuery(
  query: Record<string, string | string[] | undefined>,
  expected: Record<string, string | RegExp>,
): void {
  Object.entries(expected).forEach(([key, matcher]) => {
    expect(query, `Thiếu query param '${key}'`).to.have.property(key);
    const rawValue = query[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

    if (typeof matcher === 'string') {
      expect(value, `Giá trị query '${key}'`).to.eq(matcher);
      return;
    }

    expect(value, `Giá trị query '${key}'`).to.match(matcher);
  });
}
