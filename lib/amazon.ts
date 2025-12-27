/**
 * ISBN-13をISBN-10に変換
 * Amazonの商品ページはISBN-10の方が安定して動作するため、
 * ISBN-13が渡された場合は自動的にISBN-10に変換します
 *
 * @param isbn13 ISBN-13（978で始まる13桁のISBN）
 * @returns ISBN-10（10桁のISBN）または変換不可能な場合はnull
 */
export function convertIsbn13ToIsbn10(isbn13: string): string | null {
  const cleaned = isbn13.replace(/[-\s]/g, '');

  if (cleaned.length !== 13 || !cleaned.startsWith('978')) {
    return null;
  }

  const isbn9 = cleaned.substring(3, 12);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn9[i]) * (10 - i);
  }

  const checkDigit = (11 - (sum % 11)) % 11;
  const checkChar = checkDigit === 10 ? 'X' : checkDigit.toString();

  return isbn9 + checkChar;
}

/**
 * ISBNを正規化し、可能であればISBN-10に変換
 *
 * @param isbn ISBN-10またはISBN-13
 * @returns 正規化されたISBN（可能な場合はISBN-10）
 */
export function normalizeIsbn(isbn: string): string {
  const cleaned = isbn.replace(/[-\s]/g, '');

  if (cleaned.length === 13 && cleaned.startsWith('978')) {
    const isbn10 = convertIsbn13ToIsbn10(cleaned);
    if (isbn10) {
      return isbn10;
    }
  }

  return cleaned;
}

export const generateAmazonLink = (isbn: string): string => {
  const associateId = process.env.EXPO_PUBLIC_AMAZON_ASSOCIATE_ID || 'test-22';
  const normalizedIsbn = normalizeIsbn(isbn);
  return `https://www.amazon.co.jp/dp/${normalizedIsbn}?tag=${associateId}`;
};

export const generateKindleLink = (isbn: string): string => {
  const associateId = process.env.EXPO_PUBLIC_AMAZON_ASSOCIATE_ID || 'test-22';
  const normalizedIsbn = normalizeIsbn(isbn);
  return `https://www.amazon.co.jp/s?k=${normalizedIsbn}+kindle&tag=${associateId}`;
};

/**
 * タイトルと著者名でAmazonを検索するリンクを生成
 * ISBNがない書籍の場合に使用します
 *
 * @param title 書籍のタイトル
 * @param author 著者名（オプション）
 * @returns Amazon検索ページのURL
 */
export const generateAmazonSearchLink = (title: string, author?: string): string => {
  const associateId = process.env.EXPO_PUBLIC_AMAZON_ASSOCIATE_ID || 'test-22';
  const searchQuery = author ? `${title} ${author}` : title;
  const encodedQuery = encodeURIComponent(searchQuery);
  return `https://www.amazon.co.jp/s?k=${encodedQuery}&tag=${associateId}`;
};

/**
 * タイトルと著者名でKindleを検索するリンクを生成
 * ISBNがない書籍の場合に使用します
 *
 * @param title 書籍のタイトル
 * @param author 著者名（オプション）
 * @returns Amazon Kindle検索ページのURL
 */
export const generateKindleSearchLink = (title: string, author?: string): string => {
  const associateId = process.env.EXPO_PUBLIC_AMAZON_ASSOCIATE_ID || 'test-22';
  const searchQuery = author ? `${title} ${author} kindle` : `${title} kindle`;
  const encodedQuery = encodeURIComponent(searchQuery);
  return `https://www.amazon.co.jp/s?k=${encodedQuery}&tag=${associateId}`;
};

export interface AmazonLinkOptions {
  isbn?: string;
  title: string;
  authors?: string[];
}

/**
 * 書籍情報から最適なAmazonリンクを生成
 *
 * ISBNがある場合:
 * - ISBN-13→ISBN-10に自動変換
 * - 商品ページ（/dp/）へのダイレクトリンク
 *
 * ISBNがない場合:
 * - タイトルと著者名で検索ページへのリンク
 * - ユーザーが手動で選択できる
 *
 * @param options 書籍情報（ISBN、タイトル、著者）
 * @returns 最適化されたAmazonリンク
 */
export const generateSmartAmazonLink = (options: AmazonLinkOptions): string => {
  if (options.isbn && !options.isbn.startsWith('gbook_')) {
    return generateAmazonLink(options.isbn);
  }

  const author = options.authors && options.authors.length > 0 ? options.authors[0] : undefined;
  return generateAmazonSearchLink(options.title, author);
};

/**
 * 書籍情報から最適なKindleリンクを生成
 *
 * ISBNがある場合:
 * - ISBN-13→ISBN-10に自動変換
 * - ISBN + "kindle"で検索
 *
 * ISBNがない場合:
 * - タイトルと著者名 + "kindle"で検索
 *
 * @param options 書籍情報（ISBN、タイトル、著者）
 * @returns 最適化されたKindle検索リンク
 */
export const generateSmartKindleLink = (options: AmazonLinkOptions): string => {
  if (options.isbn && !options.isbn.startsWith('gbook_')) {
    return generateKindleLink(options.isbn);
  }

  const author = options.authors && options.authors.length > 0 ? options.authors[0] : undefined;
  return generateKindleSearchLink(options.title, author);
};
