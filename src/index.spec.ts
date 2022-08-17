import { sayHello } from '.';

test('did app say hello?', () => {
  expect(sayHello()).toBe('hello');
});
