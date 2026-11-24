# 주문 목록 변환 과제

Classic ASP 주문 목록 예시의 조회 기능을 Node.js로 구현하고 주문 상태 변경 API를 추가했습니다. 데이터베이스 대신 코드의 샘플 배열을 사용합니다.

## 실행 방법

Node.js 18 이상이 필요합니다.

Git 저장소를 복제하거나 ZIP을 푼 뒤, 프로젝트 폴더에서 실행합니다.

```powershell
npm install
npm start
```

브라우저에서 `http://localhost:3000`을 엽니다. 기본 포트는 3000이며 `PORT` 환경 변수로 바꿀 수 있습니다. 외부 패키지는 사용하지 않습니다. 데이터는 메모리에 있으므로 서버를 재시작하면 주문 상태가 모두 `대기`로 돌아갑니다.

## 기능과 확인 방법

- `GET /`: 전체 주문상품 3줄을 `1002 볼펜 → 1001 볼펜 → 1001 수첩` 순서로 표시합니다.
- `GET /?order_no=1001`: 1001의 볼펜과 수첩을 모두 표시합니다. 검색어가 없으면 전체 목록을 표시합니다.
- `GET /?order_no=9999`: `조회 결과 없음`을 표시합니다.
- 금액은 각 줄의 `수량 × 주문 당시 단가`로 계산합니다.
- 상태 변경 후 페이지를 새로고침하면 변경된 주문 상태가 보입니다.
- 검색 옆의 **전체보기**를 누르면 검색어를 지우고 전체 목록으로 돌아갑니다.
- 오른쪽 끝의 SVG **새로고침** 버튼은 현재 검색 상태를 유지한 채 화면을 다시 읽습니다.

화면 구조는 `index.html`, 스타일은 `styles.css`, 데이터 처리와 API는 `server.js`에 나누어 두었습니다. 코드 들여쓰기는 4칸을 사용합니다.

### 상태 변경 API

`PATCH /api/orders/:orderNo/status`에 JSON 본문 `{"status":"완료"}`를 보냅니다. 아래 예시는 PowerShell에서 실행할 수 있습니다.

```powershell
Invoke-RestMethod -Method Patch -Uri 'http://localhost:3000/api/orders/1001/status' -ContentType 'application/json; charset=utf-8' -Body '{"status":"완료"}'
```

| 사례 | 요청 | HTTP | 결과 |
|---|---|---:|---|
| 대기인 1001 완료 | `PATCH /api/orders/1001/status`, `{"status":"완료"}` | 200 | `{"orderNo":1001,"status":"완료","changedRows":1}` |
| 완료된 1001 재요청 | 같은 요청 | 200 | `{"orderNo":1001,"status":"완료","changedRows":0}` |
| 없는 주문 | `PATCH /api/orders/9999/status`, `{"status":"완료"}` | 404 | `{"error":"주문을 찾을 수 없습니다"}` |
| 허용하지 않는 상태 | `PATCH /api/orders/1002/status`, `{"status":"취소"}` | 400 | `{"error":"허용하지 않는 상태값입니다"}` |

잘못된 JSON 또는 누락된 `status`는 400 오류를 반환합니다. 응답의 `changedRows`는 테스트 횟수가 아니라 이번 요청으로 상태가 실제로 바뀐 주문 수입니다. 1001은 상품이 두 줄이어도 주문은 한 건입니다. 오류 요청은 데이터를 변경하지 않으며 오류 응답에는 `changedRows`가 없습니다. 1001의 상태를 바꿔도 상품 두 줄, 금액, 1002 상태는 유지됩니다.

## 결과 확인 방법

Node.js 22.20.0 환경에서 `npm install`과 `npm start`로 실행했습니다. PowerShell의 `Invoke-WebRequest`로 화면의 HTML 응답과 API의 HTTP 상태·JSON 응답을 확인했습니다.

1. `GET /`과 검색어가 빈 요청에서 상품 3줄, 정렬 순서 `1002 볼펜 → 1001 볼펜 → 1001 수첩`, 금액 `90,000원·50,000원·100,000원`을 확인했습니다.
2. `GET /?order_no=1001`에서 상품 2줄, `GET /?order_no=9999`에서 `조회 결과 없음`을 확인했습니다.
3. 1001 완료 요청에서 변경 1건과 조회 화면의 완료 상태를 확인했습니다. 같은 요청을 다시 보내 변경 0건을 확인했습니다.
4. 없는 주문은 404, 허용하지 않는 상태값은 400을 확인했습니다. 두 경우 모두 다른 주문의 상태와 상품·금액이 유지됐습니다.

이 확인은 샘플 데이터와 과제의 지정 사례를 대상으로 합니다. 실제 DB 연결과 SQL 실행은 과제 범위에 포함되지 않아 수행하지 않았습니다.

## DB 저장 설계안

이 설계와 SQL은 설명용입니다. 실행 시 DB를 설치하거나 연결하지 않습니다. PostgreSQL 문법을 기준으로 작성했습니다.

| 테이블 | 컬럼 | 역할 |
|---|---|---|
| `orders` | `order_no INTEGER PRIMARY KEY` | 주문 기본키 |
| `orders` | `buyer_name TEXT NOT NULL` | 주문자 |
| `orders` | `status TEXT NOT NULL` | 주문 상태 |
| `order_items` | `item_id INTEGER PRIMARY KEY` | 주문상품 기본키 |
| `order_items` | `order_no INTEGER NOT NULL REFERENCES orders(order_no)` | `orders`와 연결하는 외래키 |
| `order_items` | `product_name TEXT NOT NULL` | 주문 당시 상품명 |
| `order_items` | `quantity INTEGER NOT NULL` | 수량 |
| `order_items` | `unit_price INTEGER NOT NULL` | 주문 당시 단가 |

한 주문에 여러 상품이 들어가므로 주문과 주문상품을 분리했습니다. 주문 상태는 `orders`에 한 번만 저장합니다. `unit_price`는 주문 당시 값으로 `order_items`에 보관하므로 같은 상품도 주문마다 단가가 다를 수 있고, 이후 상품 가격이 바뀌어도 기존 주문의 단가와 계산 금액이 유지됩니다.

### 목록 조회 SQL

다음 SQL은 전체 목록을 조회합니다. 화면의 주문번호 검색은 배열에서 처리합니다. DB에서 검색한다면 `WHERE o.order_no = $1` 조건을 추가할 수 있습니다.

```sql
SELECT o.order_no, o.buyer_name, o.status,
       i.product_name, i.quantity, i.unit_price,
       i.quantity * i.unit_price AS amount
FROM orders AS o
JOIN order_items AS i ON i.order_no = o.order_no
ORDER BY o.order_no DESC, i.product_name ASC;
```

### 상태 변경 SQL

API에서 요청 상태값이 `완료`인지 먼저 검사한 후 다음 한 문장을 실행하는 설계입니다. `$1`은 주문번호이며, 현재 상태가 `대기`인 주문만 변경합니다.

```sql
UPDATE orders
SET status = '완료'
WHERE order_no = $1
  AND status = '대기';
```

SQL 실행 결과의 변경 행 수가 1이면 상태가 바뀐 것입니다. 0이면 추가 변경이 없습니다. 변경 후 `SELECT status FROM orders WHERE order_no = $1`로 상태를 확인합니다. 조회 결과가 없으면 없는 주문이고, `완료`이면 이미 완료된 주문입니다. 실제 프로그램은 같은 판단을 메모리 배열에서 수행합니다.

## 작업 과정과 AI 활용

1. 과제 문서에서 조회 순서, 검색 결과, 상태 변경·재요청 조건을 확인하고 샘플 주문을 배열로 구성했습니다.
2. Node.js 기본 HTTP 서버로 목록 화면과 상태 변경 API를 구현하고, DB 설계와 SQL은 실행 코드와 분리해 문서화했습니다.
3. 화면 사용성을 검토해 전체보기·새로고침을 추가하고 HTML·CSS·서버 코드를 분리했습니다.
4. 코드와 SQL을 읽기 쉬운 형태로 정리한 뒤, 과제의 정상·오류 사례를 HTTP 요청으로 재확인했습니다.

**AI 도구·모델:** OpenAI Codex(GPT-6 기반). 요구사항 분석과 개발명세서 작성, Node.js 코드·README 초안 작성 및 이후 수정에 사용했습니다.

**주요 프롬프트 2개:** 실제 대화에서 나눠서 요청한 내용을 목적과 검증 기준 중심으로 묶어 정리했습니다. 원문 그대로의 인용은 아닙니다.

1. “과제 DOCX랑 ASP 코드를 읽고 주문 목록에 꼭 필요한 기능이 뭔지 정리하고 Node.js로 만들어줘. DB는 연결하지 말고 문서에 있는 샘플 데이터를 배열로 사용해줘. 전체 목록이랑 주문번호 검색이 맞게 나오고 금액도 수량 곱하기 단가로 계산되게 해줘. 상태 변경 API는 대기에서 완료로 바뀌게 하고 같은 요청을 다시 보냈을 때랑 없는 주문이나 잘못된 상태값을 보냈을 때도 과제 조건대로 처리해줘.”
2. “지금 구현한 코드를 원본 ASP랑 다시 비교해줘. HTML이 서버 코드 안에 있어서 화면 수정하기 불편하니까 HTML과 CSS를 따로 분리해줘. 파일을 나눈 뒤에도 1001 검색 결과가 두 줄인지 9999는 조회 결과 없음인지 전체 목록 순서와 금액이 맞는지 확인해줘. 상태 변경 뒤 조회 화면에 완료가 반영되는지도 다시 확인해줘.”

**AI 결과 중 채택하지 않은 부분:** 초기 구현은 HTML과 CSS가 `server.js`의 긴 문자열 안에 섞여 있었습니다. 화면을 수정할 때 서버 로직까지 함께 읽어야 하는 구조라 그대로 사용하지 않고, HTML·CSS·서버 코드를 각각의 파일로 분리하도록 요청했습니다.
