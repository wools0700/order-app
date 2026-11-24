'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const pageTemplate = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const stylesheetPath = path.join(__dirname, 'styles.css');

const orders = [
    {
        orderNo: 1001,
        buyerName: '홍길동',
        status: '대기',
        items: [
            { productName: '볼펜', quantity: 100, unitPrice: 500 },
            { productName: '수첩', quantity: 50, unitPrice: 2000 },
        ],
    },
    {
        orderNo: 1002,
        buyerName: '김철수',
        status: '대기',
        items: [{ productName: '볼펜', quantity: 200, unitPrice: 450 }],
    },
];

const formatNumber = (value) => value.toLocaleString('ko-KR');

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify(data));
}

function renderPage(searchTerm) {
    const selectedOrders = orders
        .filter((order) => !searchTerm || String(order.orderNo) === searchTerm)
        .sort((a, b) => b.orderNo - a.orderNo);

    let tableBody = '';

    for (const order of selectedOrders) {
        const sortedItems = [...order.items].sort((a, b) =>
            a.productName.localeCompare(b.productName, 'ko-KR'),
        );

        for (const item of sortedItems) {
            const amount = item.quantity * item.unitPrice;
            tableBody += `
            <tr>
                <td>${escapeHtml(order.orderNo)}</td>
                <td>${escapeHtml(order.buyerName)}</td>
                <td>${escapeHtml(item.productName)}</td>
                <td class="number">${formatNumber(item.quantity)}</td>
                <td class="number">${formatNumber(item.unitPrice)}</td>
                <td class="number">${formatNumber(amount)}</td>
                <td>${escapeHtml(order.status)}</td>
            </tr>`;
        }
    }

    if (tableBody === '') {
        tableBody = '<tr><td colspan="7" class="empty">조회 결과 없음</td></tr>';
    }

    return pageTemplate
        .replace('{{TABLE_BODY}}', tableBody)
        .replace('{{SEARCH_TERM}}', escapeHtml(searchTerm));
}

async function readJsonBody(request) {
    const chunks = [];

    for await (const chunk of request) {
        chunks.push(chunk);
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleRequest(request, response) {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/styles.css') {
        response.writeHead(200, {
            'Content-Type': 'text/css; charset=utf-8',
            'Cache-Control': 'no-store',
        });
        response.end(fs.readFileSync(stylesheetPath, 'utf8'));
        return;
    }

    if (request.method === 'GET' && url.pathname === '/') {
        const searchTerm = (url.searchParams.get('order_no') || '').trim();
        response.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
        });
        response.end(renderPage(searchTerm));
        return;
    }

    const statusRoute = /^\/api\/orders\/(\d+)\/status$/.exec(url.pathname);
    if (request.method === 'PATCH' && statusRoute) {
        let body;
        try {
            body = await readJsonBody(request);
        } catch {
            sendJson(response, 400, { error: '잘못된 요청입니다' });
            return;
        }

        if (!body || typeof body !== 'object' || Array.isArray(body) || body.status === undefined) {
            sendJson(response, 400, { error: '잘못된 요청입니다' });
            return;
        }
        if (body.status !== '완료') {
            sendJson(response, 400, { error: '허용하지 않는 상태값입니다' });
            return;
        }

        const order = orders.find((entry) => String(entry.orderNo) === statusRoute[1]);
        if (!order) {
            sendJson(response, 404, { error: '주문을 찾을 수 없습니다' });
            return;
        }

        const changedRows = order.status === '대기' ? 1 : 0;
        if (changedRows) order.status = '완료';
        sendJson(response, 200, { orderNo: order.orderNo, status: order.status, changedRows });
        return;
    }

    sendJson(response, 404, { error: '요청한 경로를 찾을 수 없습니다' });
}

const port = Number(process.env.PORT) || 3000;
http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
        console.error(error);
        if (!response.headersSent) {
            sendJson(response, 500, { error: '서버 오류가 발생했습니다' });
        } else {
            response.end();
        }
    });
}).listen(port, '127.0.0.1', () => {
    console.log(`주문 목록: http://localhost:${port}`);
});
