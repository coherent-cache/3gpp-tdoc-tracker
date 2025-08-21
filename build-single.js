import fs from "fs";
import path from "path";
import { execSync } from "child_process";

console.log("Building single-file version...");

// First, build the regular version
console.log("1. Building regular version...");
execSync("npm run build", { stdio: "inherit" });

// Read the built files
const distDir = "./dist";
const indexPath = path.join(distDir, "index.html");
const indexContent = fs.readFileSync(indexPath, "utf8");

// Find CSS and JS files
const assetsDir = path.join(distDir, "assets");
const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith(".css"));
const jsFile = files.find((f) => f.endsWith(".js"));

if (!cssFile || !jsFile) {
  throw new Error("Could not find CSS or JS files in assets directory");
}

console.log("2. Reading CSS and JS files...");
const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), "utf8");
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), "utf8");

console.log("3. Creating single HTML file...");

// Create the single HTML file
const singleFileContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>3GPP TDoc Tracker</title>
    <style>
${cssContent}
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
${jsContent}
    </script>
  </body>
</html>`;

// Write the single file
const outputPath = path.join(distDir, "3gpp-tdoc-tracker.html");
fs.writeFileSync(outputPath, singleFileContent);

console.log(`✅ Single file created: ${outputPath}`);

// Clean up unnecessary files since we only need the single HTML file
console.log("4. Cleaning up build artifacts...");
fs.rmSync(indexPath); // Remove index.html
fs.rmSync(assetsDir, { recursive: true, force: true }); // Remove assets folder

console.log("🧹 Cleaned up index.html and assets folder");
console.log(
  "📁 You can now copy this file to any Windows machine and open it in a browser!"
);
