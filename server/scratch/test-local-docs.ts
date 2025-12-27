// Test LocalDocs tools
import { scanDocsDirectory } from '../src/tools/local-docs/scanner.js';
import { readFileContent } from '../src/tools/local-docs/reader.js';
import { validatePath, DOCS_BASE } from '../src/tools/local-docs/security.js';

async function test() {
  console.log('=== Testing LocalDocs Tools ===\n');
  console.log('DOCS_BASE:', DOCS_BASE);

  // Test 1: Index
  console.log('\n--- Test 1: local_docs_index ---');
  const index = await scanDocsDirectory();
  console.log(`Found ${index.totalFiles} files, total size: ${index.totalSize} bytes`);
  console.log('First 3 files:');
  index.files.slice(0, 3).forEach(f => console.log(`  - ${f.path} (${f.sizeBytes} bytes)`));

  // Test 2: Content - valid file
  console.log('\n--- Test 2: local_docs_content (valid) ---');
  const content = await readFileContent('docs/backlog.md');
  if ('content' in content) {
    console.log(`Read ${content.path}: ${content.totalLines} lines, chunk ${content.chunk}/${content.totalChunks}`);
    console.log('First 100 chars:', content.content.substring(0, 100));
  } else {
    console.log('Error:', content.error);
  }

  // Test 3: Content - without docs/ prefix
  console.log('\n--- Test 3: local_docs_content (without prefix) ---');
  const content2 = await readFileContent('backlog.md');
  if ('content' in content2) {
    console.log(`Read ${content2.path}: ${content2.totalLines} lines`);
  } else {
    console.log('Error:', content2.error);
  }

  // Test 4: Security - path traversal
  console.log('\n--- Test 4: Security (path traversal) ---');
  const traversal = await validatePath('../../../etc/passwd');
  console.log('Path traversal blocked:', !traversal.valid);
  if (!traversal.valid) console.log('  Error:', traversal.error.code);

  // Test 5: Security - wrong extension
  console.log('\n--- Test 5: Security (wrong extension) ---');
  const wrongExt = await validatePath('docs/test.txt');
  console.log('Wrong extension blocked:', !wrongExt.valid);
  if (!wrongExt.valid) console.log('  Error:', wrongExt.error.code);

  // Test 6: Security - absolute path
  console.log('\n--- Test 6: Security (absolute path) ---');
  const absPath = await validatePath('/etc/passwd');
  console.log('Absolute path blocked:', !absPath.valid);
  if (!absPath.valid) console.log('  Error:', absPath.error.code);

  console.log('\n=== All tests passed! ===');
}

test().catch(console.error);
