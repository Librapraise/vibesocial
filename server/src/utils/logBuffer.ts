// Simple circular log buffer for admin console

const MAX_LOGS = 200;
export const logBuffer: string[] = [];

export function addLog(message: string) {
  const timestamp = new Date().toISOString();
  logBuffer.push(`[${timestamp}] ${message}`);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift();
  }
}

// Intercept console functions
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  originalLog.apply(console, args);
  addLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

console.error = (...args: any[]) => {
  originalError.apply(console, args);
  addLog(`ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
};

console.warn = (...args: any[]) => {
  originalWarn.apply(console, args);
  addLog(`WARN: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
};
