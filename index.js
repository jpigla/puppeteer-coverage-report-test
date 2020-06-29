const puppeteer = require('puppeteer')
const fs = require("fs");

const decimal_separator = "comma"; // [comma/dot]
const projectname = "cobi"
const urlToTest = [
    "https://www.computerbild.de/",
    "https://www.computerbild.de/news/",
    "https://www.computerbild.de/artikel/avf-News-Fernseher-beste-Filme-Serien-Netflix-Amazon-Sky-25241351.html",
    "https://www.computerbild.de/artikel/cb-Tests-Handy-Apple-iPhone-SE-iPhone-SE-2-Test-18570103.html"
]

//Scroll to end of the page 
const autoScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);  
                    resolve();
                }
            }, 100);
        });
    });
}

const run = async (url, timestamp) => {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setCacheEnabled(false);
    await page.setViewport({
        width: 1200,
        height: 800
    });

    await Promise.all([
        page.coverage.startJSCoverage(),
        page.coverage.startCSSCoverage()
    ]);
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await autoScroll(page);

    // Disable both JavaScript and CSS coverage
    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage(),
    ]);
    let totalBytes = 0;
    let usedBytes = 0;
    const coverage = [...jsCoverage, ...cssCoverage];
    for (const entry of coverage) {

        if (entry.url.indexOf('.js') > 0 || entry.url.indexOf('.css') > 0) {
            totalBytes += entry.text.length;
            let singleUsedBytes = 0
            for (const range of entry.ranges) {
                usedBytes += range.end - range.start - 1;
                singleUsedBytes += range.end - range.start - 1;
            }

            //Single css or js file data
            let singleUnusedBytes = ((100 - (singleUsedBytes / entry.text.length * 100)) / 100).toFixed(3);
            if (decimal_separator == "comma") {
                singleUnusedBytes = singleUnusedBytes.replace(".", ",");
            }
            //console.log(singleBytes.toFixed(1) + '% used in ' + entry.url)
            //Write csv
            await fs.appendFile('results/' + projectname + `/${timestamp}-data.csv`, url + '\t' + entry.url + '\t' + singleUnusedBytes + '\r\n', function (err) {
                if (err) throw err;
            });
        }
    }

    console.log(`Bytes used: ${usedBytes / totalBytes * 100}%`);
    await browser.close()
}

//Start
const start = async () => {

    let timestamp = new Date().getTime();

    //Generate output file
    await fs.promises.mkdir('results/' + projectname, { recursive: true })
    if (!fs.existsSync('results/' + projectname + `/${timestamp}-data.csv`)) {
        await fs.appendFile('results/' + projectname + `/${timestamp}-data.csv`, 'url\tasset url\t% unused\r\n', function (err) {
            if (err) throw err;
        });
    }

    //Look URL array
    for (let i = 0; i < urlToTest.length; i++) {
        await run(urlToTest[i], timestamp)
    }
}

start()