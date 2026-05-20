// Mock expo-router
module.exports = {
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: {
    Screen: ({ children }) => children ?? null,
  },
  Link: ({ children }) => children,
};
