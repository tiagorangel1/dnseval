import colors from "yoctocolors";
const fs = require("fs");
const dns = require("dns");

const SAMPLES_PER_HOST = 200; // test each website SAMPLES_PER_HOST times

const HOSTS_TO_CHECK =
  "google.com,root-servers.net,googleapis.com,apple.com,gstatic.com,cloudflare.com,facebook.com,tiktokcdn.com,microsoft.com,amazonaws.com,googlevideo.com,fbcdn.net,whatsapp.net,doubleclick.net,youtube.com,instagram.com,apple-dns.net,icloud.com,akadns.net,amazon.com,googleusercontent.com,akamai.net,tiktokv.com,ntp.org,googlesyndication.com,live.com,cloudfront.net,tiktokrow-cdn.com,cloudflare-dns.com,cdn77.org,gvt2.com,akamaiedge.net,cdninstagram.com,aaplimg.com,tiktokeu-cdn.com,bytefcdn-oversea.com,netflix.com,bing.com,tiktokcdn-eu.com,ytimg.com,spotify.com,gvt1.com,office.com,yahoo.com,gccdn.net,bytefcdn-ttpeu.com,googleadservices.com,samsung.com,dns.google,snapchat.com,google-analytics.com,unity3d.com,twitter.com,fastly.net,amazon-adsystem.com,one.one,app-measurement.com,ttlivecdn.com,app-analytics-services.com,applovin.com,msftncsi.com,criteo.com,googletagmanager.com,azure.com,trafficmanager.net,rocket-cdn.com,ui.com,steamserver.net,roblox.com,msn.com,ggpht.com,wikipedia.org,appsflyersdk.com,baidu.com,linkedin.com,skype.com,rubiconproject.com,windows.net,sentry.io,a2z.com,microsoftonline.com,whatsapp.com,office.net,digicert.com,tiktokcdn-us.com,rbxcdn.com,xiaomi.com,adnxs.com,windows.com,taboola.com,doubleverify.com,3gppnetwork.org,android.com,gmail.com,casalemedia.com,qq.com,sharepoint.com,cdn-apple.com,qlivecdn.com,pangle.io".split(","); // most popular website in the world

function createProgressBar(current, total, width = 40) {
  const progress = Math.round((current / total) * width);
  const emptyProgress = width - progress;
  const progressText = colors.yellow("█".repeat(progress));
  const emptyProgressText = colors.dim("░".repeat(emptyProgress));
  const percentage = ((current / total) * 100).toFixed(1);

  return `${progressText}${emptyProgressText}  ${percentage}%`;
}

async function resolveAndTime(url, dnsServerIP, family) {
  try {
    const start = performance.now();
    await new Promise((resolve, reject) => {
      dns.lookup(
        url,
        {
          family: family,
          all: false,
          hints:
            dns.ADDRCONFIG | (family === 4 ? dns.LOOKUP_IPV4 : dns.LOOKUP_IPV6),
          address: dnsServerIP,
        },
        (err, address) => {
          if (err) reject(err);
          else resolve(address);
        }
      );
    });
    const end = performance.now();
    return { success: true, time: end - start };
  } catch (error) {
    return { success: false, time: -1, error: error.message };
  }
}

async function testIPAddress(
  ip,
  websites,
  totalTests,
  currentTest,
  currentProvider,
  totalProviders,
  providerName
) {
  const results = [];
  const isIPv6 = ip.includes(":");

  for (const website of websites) {
    const timings = [];
    for (let i = 0; i < SAMPLES_PER_HOST; i++) {
      const result = await resolveAndTime(website, ip, isIPv6 ? 6 : 4);
      if (result.success) timings.push(result.time);
    }
    if (timings.length) {
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      results.push({ ip, avgTime });
    }

    currentTest++;

    const overallProgress = createProgressBar(
      (currentProvider - 1) * totalTests + currentTest,
      totalProviders * totalTests
    );

    console.clear();
    console.log(
      `              ${colors.dim(
        "D N S / E V A L"
      )}\n\n${overallProgress}\n\n${colors.dim(
        "Sampling"
      )} ${providerName}\n${colors.dim("IP")}       ${ip}\n${colors.dim(
        "Host"
      )}     ${website}`
    );
  }

  return results;
}

async function testDNSProvider(
  provider,
  websites,
  currentProvider,
  totalProviders
) {
  const [name, ipv4, ipv6] = provider;
  const ipv4Addresses = ipv4.split(";").filter(Boolean);
  const ipv6Addresses = ipv6.split(";").filter(Boolean);
  const totalTests =
    (ipv4Addresses.length + ipv6Addresses.length) * websites.length;
  let currentTest = 0;

  const ipv4Results = [];
  for (const ip of ipv4Addresses) {
    const results = await testIPAddress(
      ip,
      websites,
      totalTests,
      currentTest,
      currentProvider,
      totalProviders,
      name
    );
    ipv4Results.push(...results);
    currentTest += websites.length;
  }

  const ipv6Results = [];
  for (const ip of ipv6Addresses) {
    const results = await testIPAddress(
      ip,
      websites,
      totalTests,
      currentTest,
      currentProvider,
      totalProviders,
      name
    );
    ipv6Results.push(...results);
    currentTest += websites.length;
  }

  const allResults = [...ipv4Results, ...ipv6Results].map((r) => r.avgTime);

  if (!allResults.length) {
    return {
      name,
      "median ms": "N/A",
      "min ms": "N/A",
      "max ms": "N/A",
      samples: 0,
    };
  }

  const sortedResults = allResults.sort((a, b) => a - b);
  const mid = Math.floor(sortedResults.length / 2);
  const median =
    sortedResults.length % 2 === 0
      ? (sortedResults[mid - 1] + sortedResults[mid]) / 2
      : sortedResults[mid];

  return {
    name,
    "median ms": median.toFixed(4),
    "min ms": Math.min(...allResults).toFixed(4),
    "max ms": Math.max(...allResults).toFixed(4),
    samples: allResults.length.toString(),
  };
}

async function main() {
  const csvData = fs.readFileSync("providers.csv", "utf8");
  const lines = csvData.trim().split("\n");
  const providers = lines.slice(1).map((line) => line.split(","));

  const results = [];
  for (let i = 0; i < providers.length; i++) {
    const result = await testDNSProvider(
      providers[i],
      HOSTS_TO_CHECK,
      i + 1,
      providers.length
    );
    results.push(result);
  }

  console.clear();
  console.log(`${colors.dim("Scanning complete.")}\n`);

  console.table(
    results.sort((a, b) => {
      if (a["median ms"] === "N/A") return 1;
      if (b["median ms"] === "N/A") return -1;
      return parseFloat(a["median ms"]) - parseFloat(b["median ms"]);
    })
  );
  process.stdout.write("\x1B[?25h");
}

process.stdout.write("\x1B[?25l");

main();
