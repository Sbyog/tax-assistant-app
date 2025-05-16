const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const toIco = require('to-ico');

// Make sure the public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Path to your source image - replace with your actual 500x500 image path
const sourceImage = process.argv[2];
if (!sourceImage) {
    console.error('Please provide the path to your source image.');
    console.error('Usage: node generate-icons.js path/to/your/image.png');
    process.exit(1);
}

async function generateIcons() {
    try {
        // Generate logo512.png
        await sharp(sourceImage)
            .resize(512, 512)
            .png()
            .toFile(path.join(publicDir, 'logo512.png'));
        console.log('Generated logo512.png');

        // Generate logo192.png
        await sharp(sourceImage)
            .resize(192, 192)
            .png()
            .toFile(path.join(publicDir, 'logo192.png'));
        console.log('Generated logo192.png');

        // Generate different sizes for favicon.ico
        const sizes = [64, 32, 24, 16];
        const buffers = await Promise.all(
            sizes.map(size => 
                sharp(sourceImage)
                    .resize(size, size)
                    .toFormat('png')
                    .toBuffer()
            )
        );

        // Convert the PNG buffers to ICO
        const icoBuffer = await toIco(buffers);
        
        // Save the ICO file
        fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
        console.log('Generated favicon.ico with all sizes');
        
        console.log('\nAll icons generated successfully!');
        
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();