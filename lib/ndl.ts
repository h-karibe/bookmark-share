/**
 * National Diet Library (NDL) API Client
 * 国会図書館サーチAPI クライアント
 *
 * OpenSearch APIを使用して書籍情報を検索します
 * https://ndlsearch.ndl.go.jp/help/api/specifications
 */

const NDL_BASE_URL = 'https://ndlsearch.ndl.go.jp/api/opensearch';

export interface NDLBookInfo {
  title?: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  thumbnail?: string;
  description?: string;
}

/**
 * ISBNから書籍情報を取得
 * @param isbn ISBN-10またはISBN-13
 * @returns 書籍情報
 */
export async function searchBookByISBN(isbn: string): Promise<NDLBookInfo | null> {
  try {
    // ISBNをクリーンアップ（ハイフンを削除）
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    // OpenSearch APIリクエスト
    const params = new URLSearchParams({
      isbn: cleanIsbn,
      cnt: '1', // 1件のみ取得
      mediatype: '1', // 1=本
    });

    const response = await fetch(`${NDL_BASE_URL}?${params}`);

    if (!response.ok) {
      console.error('NDL API error:', response.status);
      return null;
    }

    const xmlText = await response.text();

    // XMLをパース
    const bookInfo = parseNDLResponse(xmlText);

    return bookInfo;
  } catch (error) {
    console.error('Error fetching from NDL API:', error);
    return null;
  }
}

/**
 * NDL APIのXMLレスポンスをパース
 * @param xmlText XMLテキスト
 * @returns パースされた書籍情報
 */
function parseNDLResponse(xmlText: string): NDLBookInfo | null {
  try {
    // DOMParserを使用してXMLをパース
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // itemタグを取得（最初の結果のみ）
    const item = xmlDoc.querySelector('item');

    if (!item) {
      return null;
    }

    // 基本情報を取得
    const title = getTextContent(item, 'title');
    const author = getTextContent(item, 'author') || getTextContent(item, 'creator');
    const publisher = getTextContent(item, 'publisher');
    const pubDate = getTextContent(item, 'pubDate');
    const description = getTextContent(item, 'description');

    // ISBNを取得（複数ある場合を考慮）
    const identifiers = item.querySelectorAll('identifier');
    let isbn10: string | undefined;
    let isbn13: string | undefined;

    identifiers.forEach((identifier) => {
      const type = identifier.getAttribute('type');
      const value = identifier.textContent?.trim();

      if (value && type?.includes('ISBN')) {
        // ISBN-10とISBN-13を識別
        const cleanValue = value.replace(/[-\s]/g, '');
        if (cleanValue.length === 10) {
          isbn10 = cleanValue;
        } else if (cleanValue.length === 13) {
          isbn13 = cleanValue;
        }
      }
    });

    // サムネイル画像URLを取得
    const link = item.querySelector('link');
    const linkUrl = link?.textContent?.trim();
    let thumbnail: string | undefined;

    // NDLの書影APIを使用
    if (isbn13 || isbn10) {
      const isbnForThumbnail = isbn13 || isbn10;
      thumbnail = `https://ndlsearch.ndl.go.jp/thumbnail/${isbnForThumbnail}.jpg`;
    }

    // 出版日をフォーマット
    let publishedDate: string | undefined;
    if (pubDate) {
      try {
        const date = new Date(pubDate);
        if (!isNaN(date.getTime())) {
          publishedDate = date.toISOString().split('T')[0];
        }
      } catch (e) {
        // パースに失敗した場合は元の値を使用
        publishedDate = pubDate;
      }
    }

    return {
      title,
      author,
      publisher,
      publishedDate,
      isbn: isbn13 || isbn10,
      isbn10,
      isbn13,
      thumbnail,
      description,
    };
  } catch (error) {
    console.error('Error parsing NDL XML:', error);
    return null;
  }
}

/**
 * XMLドキュメントから指定されたタグのテキストコンテンツを取得
 * @param element 親要素
 * @param tagName タグ名
 * @returns テキストコンテンツ
 */
function getTextContent(element: Element, tagName: string): string | undefined {
  const tag = element.querySelector(tagName);
  const content = tag?.textContent?.trim();
  return content || undefined;
}

/**
 * タイトルと著者で書籍を検索
 * @param title タイトル
 * @param author 著者（オプション）
 * @returns 書籍情報の配列
 */
export async function searchBookByTitleAndAuthor(
  title: string,
  author?: string
): Promise<NDLBookInfo[]> {
  try {
    const params = new URLSearchParams({
      title,
      cnt: '10',
      mediatype: '1',
    });

    if (author) {
      params.append('creator', author);
    }

    const response = await fetch(`${NDL_BASE_URL}?${params}`);

    if (!response.ok) {
      console.error('NDL API error:', response.status);
      return [];
    }

    const xmlText = await response.text();

    // XMLをパース
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const items = xmlDoc.querySelectorAll('item');
    const results: NDLBookInfo[] = [];

    items.forEach((item) => {
      const bookInfo = parseItemElement(item);
      if (bookInfo) {
        results.push(bookInfo);
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching NDL API:', error);
    return [];
  }
}

/**
 * itemエレメントから書籍情報を抽出
 * @param item itemエレメント
 * @returns 書籍情報
 */
function parseItemElement(item: Element): NDLBookInfo | null {
  const xmlSerializer = new XMLSerializer();
  const itemXml = xmlSerializer.serializeToString(item);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<root>${itemXml}</root>`, 'text/xml');
  const rootItem = doc.querySelector('item');

  if (!rootItem) {
    return null;
  }

  return parseNDLResponse(xmlSerializer.serializeToString(rootItem));
}
