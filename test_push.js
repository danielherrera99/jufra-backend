const https = require('https');
const pushToken = 'ExponentPushToken[DrJNniLlPUN09t1hoNnvst]'; // new token
const message = {
    to: pushToken,
    sound: 'default',
    title: 'Test',
    body: 'Test body',
};
const body = JSON.stringify([message]);
const req = https.request({
    hostname: 'exp.host',
    port: 443,
    path: '/--/api/v2/push/send',
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
}, (res) => {
    let resData = '';
    res.on('data', chunk => { resData += chunk; });
    res.on('end', () => {
        console.log('Response:', resData);
        const parsed = JSON.parse(resData);
        if (parsed.data && parsed.data[0] && parsed.data[0].id) {
            const receiptId = parsed.data[0].id;
            console.log('Checking receipt for ID:', receiptId);
            setTimeout(() => checkReceipt(receiptId), 2000);
        }
    });
});
req.on('error', (e) => {
    console.error('Error:', e);
});
req.write(body);
req.end();

function checkReceipt(receiptId) {
    const req2 = https.request({
        hostname: 'exp.host',
        port: 443,
        path: '/--/api/v2/push/getReceipts',
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }, (res) => {
        let resData = '';
        res.on('data', chunk => { resData += chunk; });
        res.on('end', () => {
            console.log('Receipt Response:', resData);
        });
    });
    req2.write(JSON.stringify({ ids: [receiptId] }));
    req2.end();
}
