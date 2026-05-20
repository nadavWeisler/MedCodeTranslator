// Mock expo-sqlite — used by db/database.ts
const mockDB = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
  withTransactionAsync: jest.fn().mockImplementation((fn) => fn()),
};

module.exports = {
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDB),
  __mockDB: mockDB,
};
