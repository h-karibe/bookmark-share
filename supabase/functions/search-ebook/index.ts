import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GoogleBooksVolume {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
  saleInfo?: {
    saleability?: string;
    buyLink?: string;
  };
}

interface RakutenBook {
  title?: string;
  author?: string;
  itemUrl?: string;
}

interface RakutenKoboBook {
  title?: string;
  author?: string;
  itemUrl?: string;
}

interface NDLBookInfo {
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

async function searchNDLByISBN(isbn: string): Promise<NDLBookInfo | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const params = new URLSearchParams({
      isbn: cleanIsbn,
      cnt: '1',
      mediatype: '1',
    });

    const ndlUrl = `https://ndlsearch.ndl.go.jp/api/opensearch?${params}`;
    console.log('Fetching from NDL API:', ndlUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(ndlUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error('NDL API error:', response.status);
      return null;
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const item = xmlDoc.querySelector('item');
    if (!item) {
      return null;
    }

    const getTextContent = (tagName: string): string | undefined => {
      const tag = item.querySelector(tagName);
      return tag?.textContent?.trim() || undefined;
    };

    const title = getTextContent('title');
    const author = getTextContent('author') || getTextContent('creator');
    const publisher = getTextContent('publisher');
    const pubDate = getTextContent('pubDate');
    const description = getTextContent('description');

    const identifiers = item.querySelectorAll('identifier');
    let isbn10: string | undefined;
    let isbn13: string | undefined;

    identifiers.forEach((identifier) => {
      const type = identifier.getAttribute('type');
      const value = identifier.textContent?.trim();

      if (value && type?.includes('ISBN')) {
        const cleanValue = value.replace(/[-\s]/g, '');
        if (cleanValue.length === 10) {
          isbn10 = cleanValue;
        } else if (cleanValue.length === 13) {
          isbn13 = cleanValue;
        }
      }
    });

    let thumbnail: string | undefined;
    if (isbn13 || isbn10) {
      const isbnForThumbnail = isbn13 || isbn10;
      thumbnail = `https://ndlsearch.ndl.go.jp/thumbnail/${isbnForThumbnail}.jpg`;
    }

    let publishedDate: string | undefined;
    if (pubDate) {
      try {
        const date = new Date(pubDate);
        if (!isNaN(date.getTime())) {
          publishedDate = date.toISOString().split('T')[0];
        }
      } catch (e) {
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
    console.error('NDL API error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('NDL API timed out after 30 seconds');
    }
    return null;
  }
}

function convertIsbn13ToIsbn10(isbn13: string): string | null {
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

async function handleTextSearch(query: string, limit: number, startIndex: number = 0) {
  try {
    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
    const encodedQuery = encodeURIComponent(query);
    const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${limit}&startIndex=${startIndex}&langRestrict=ja${
      googleApiKey ? `&key=${googleApiKey}` : ''
    }`;

    console.log('Searching Google Books with query:', query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(googleUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Google Books API returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return new Response(
        JSON.stringify({ books: [] }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const books = data.items.map((item: GoogleBooksVolume, index: number) => {
      const volumeInfo = item.volumeInfo || {};
      const isbn13 = volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_13'
      )?.identifier;
      const isbn10 = volumeInfo.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_10'
      )?.identifier;

      let isbn = isbn10 || isbn13 || '';

      if (!isbn10 && isbn13) {
        const converted = convertIsbn13ToIsbn10(isbn13);
        if (converted) {
          isbn = converted;
        }
      }

      if (!isbn && item.id) {
        isbn = `gbook_${item.id}`;
      }

      return {
        id: `${isbn}-${Date.now()}-${index}`,
        isbn: isbn,
        title: volumeInfo.title || '',
        authors: volumeInfo.authors || [],
        thumbnail_url: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
      };
    }).filter((book: { isbn: string; title: string }) => book.isbn && book.title);

    return new Response(
      JSON.stringify({ books }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Text search error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Search failed',
        books: [],
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { isbn, query, limit = 20, startIndex = 0, googleBooksId } = await req.json();

    if (!isbn && !query && !googleBooksId) {
      return new Response(
        JSON.stringify({ error: 'ISBN, query, or googleBooksId is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (query) {
      return handleTextSearch(query, limit, startIndex);
    }

    if (googleBooksId) {
      try {
        const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
        const googleUrl = `https://www.googleapis.com/books/v1/volumes/${googleBooksId}${
          googleApiKey ? `?key=${googleApiKey}` : ''
        }`;
        console.log('Fetching from Google Books API by ID:', googleUrl);
        const googleController = new AbortController();
        const googleTimeout = setTimeout(() => googleController.abort(), 30000);

        const googleResponse = await fetch(googleUrl, {
          signal: googleController.signal,
        });
        clearTimeout(googleTimeout);
        console.log('Google Books API response status:', googleResponse.status);

        if (!googleResponse.ok) {
          throw new Error(`Google Books API returned status ${googleResponse.status}`);
        }

        const googleData: GoogleBooksVolume = await googleResponse.json();
        const volumeInfo = googleData.volumeInfo || {};

        const isbn13 = volumeInfo.industryIdentifiers?.find(
          (id) => id.type === 'ISBN_13'
        )?.identifier;
        const isbn10 = volumeInfo.industryIdentifiers?.find(
          (id) => id.type === 'ISBN_10'
        )?.identifier;

        let bookIsbn = isbn10 || isbn13 || `gbook_${googleBooksId}`;

        if (!isbn10 && isbn13) {
          const converted = convertIsbn13ToIsbn10(isbn13);
          if (converted) {
            bookIsbn = converted;
          }
        }

        const bookData = {
          isbn: bookIsbn,
          title: volumeInfo.title || '',
          authors: volumeInfo.authors || [],
          thumbnail_url: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
          description: volumeInfo.description || '',
          paper_available: true,
          paper_links: { amazon: `https://www.amazon.co.jp/dp/${bookIsbn}` } as Record<string, string>,
          ebook_available: false,
          ebook_links: {} as Record<string, string>,
        };

        if (googleData.saleInfo?.saleability === 'FOR_SALE' && googleData.saleInfo.buyLink) {
          bookData.ebook_available = true;
          bookData.ebook_links.google_books = googleData.saleInfo.buyLink;
        }

        if (!bookData.title) {
          return new Response(
            JSON.stringify({
              error: '\u66f8\u7c4d\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f',
              details: 'Google Books API\u304b\u3089\u66f8\u7c4d\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f'
            }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        return new Response(JSON.stringify(bookData), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Google Books ID fetch error:', error);
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Internal server error',
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    const googleApiKey = Deno.env.get('GOOGLE_BOOKS_API_KEY');
    const rakutenAppId = Deno.env.get('RAKUTEN_APP_ID');

    let bookData = {
      isbn,
      title: '',
      authors: [] as string[],
      thumbnail_url: null as string | null,
      description: '',
      paper_available: false,
      paper_links: {} as Record<string, string>,
      ebook_available: false,
      ebook_links: {} as Record<string, string>,
    };

    let googleData: GoogleBooksVolume | null = null;

    try {
      const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${
        googleApiKey ? `&key=${googleApiKey}` : ''
      }`;
      console.log('Fetching from Google Books API:', googleUrl);
      const googleController = new AbortController();
      const googleTimeout = setTimeout(() => googleController.abort(), 30000);

      const googleResponse = await fetch(googleUrl, {
        signal: googleController.signal,
      });
      clearTimeout(googleTimeout);
      console.log('Google Books API response status:', googleResponse.status);
      const googleJson = await googleResponse.json();

      if (googleJson.items && googleJson.items.length > 0) {
        googleData = googleJson.items[0];
        const volumeInfo = googleData.volumeInfo || {};

        const isbn10FromApi = volumeInfo.industryIdentifiers?.find(
          (id) => id.type === 'ISBN_10'
        )?.identifier;

        if (isbn10FromApi) {
          bookData.isbn = isbn10FromApi;
        } else {
          const converted = convertIsbn13ToIsbn10(isbn);
          if (converted) {
            bookData.isbn = converted;
          }
        }

        bookData.title = volumeInfo.title || '';
        bookData.authors = volumeInfo.authors || [];
        bookData.description = volumeInfo.description || '';
        bookData.thumbnail_url =
          volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null;

        if (googleData.saleInfo?.saleability === 'FOR_SALE' && googleData.saleInfo.buyLink) {
          bookData.ebook_available = true;
          bookData.ebook_links.google_books = googleData.saleInfo.buyLink;
        }
      }
    } catch (error) {
      console.error('Google Books API error:', error instanceof Error ? error.message : error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Google Books API timed out after 30 seconds');
      }
    }

    if (bookData.isbn === isbn) {
      const converted = convertIsbn13ToIsbn10(isbn);
      if (converted) {
        bookData.isbn = converted;
      }
    }

    if (rakutenAppId) {
      try {
        const rakutenUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?applicationId=${rakutenAppId}&isbn=${isbn}`;
        console.log('Fetching from Rakuten Books API');
        const rakutenController = new AbortController();
        const rakutenTimeout = setTimeout(() => rakutenController.abort(), 30000);

        const rakutenResponse = await fetch(rakutenUrl, {
          signal: rakutenController.signal,
        });
        clearTimeout(rakutenTimeout);
        console.log('Rakuten Books API response status:', rakutenResponse.status);
        const rakutenJson = await rakutenResponse.json();

        if (rakutenJson.Items && rakutenJson.Items.length > 0) {
          const rakutenBook: RakutenBook = rakutenJson.Items[0].Item;

          if (!bookData.title) {
            bookData.title = rakutenBook.title || '';
          }
          if (bookData.authors.length === 0 && rakutenBook.author) {
            bookData.authors = [rakutenBook.author];
          }

          if (rakutenBook.itemUrl) {
            bookData.paper_available = true;
            bookData.paper_links.rakuten = rakutenBook.itemUrl;
          }
        }
      } catch (error) {
        console.error('Rakuten Books API error:', error instanceof Error ? error.message : error);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Rakuten Books API timed out after 30 seconds');
        }
      }

      try {
        const koboUrl = `https://app.rakuten.co.jp/services/api/Kobo/EbookSearch/20170426?applicationId=${rakutenAppId}&isbn=${isbn}`;
        console.log('Fetching from Rakuten Kobo API');
        const koboController = new AbortController();
        const koboTimeout = setTimeout(() => koboController.abort(), 30000);

        const koboResponse = await fetch(koboUrl, {
          signal: koboController.signal,
        });
        clearTimeout(koboTimeout);
        console.log('Rakuten Kobo API response status:', koboResponse.status);
        const koboJson = await koboResponse.json();

        if (koboJson.Items && koboJson.Items.length > 0) {
          const koboBook: RakutenKoboBook = koboJson.Items[0].Item;

          if (koboBook.itemUrl) {
            bookData.ebook_available = true;
            bookData.ebook_links.rakuten_kobo = koboBook.itemUrl;
          }
        }
      } catch (error) {
        console.error('Rakuten Kobo API error:', error instanceof Error ? error.message : error);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Rakuten Kobo API timed out after 30 seconds');
        }
      }
    }

    if (!bookData.title) {
      console.log('No data from Google Books or Rakuten, trying NDL API...');
      try {
        const ndlData = await searchNDLByISBN(isbn);

        if (ndlData && ndlData.title) {
          console.log('Found book data from NDL API:', ndlData.title);

          bookData.title = ndlData.title;
          if (ndlData.author) {
            bookData.authors = [ndlData.author];
          }
          bookData.description = ndlData.description || '';
          bookData.thumbnail_url = ndlData.thumbnail || null;

          if (ndlData.isbn10) {
            bookData.isbn = ndlData.isbn10;
          } else if (ndlData.isbn13) {
            const converted = convertIsbn13ToIsbn10(ndlData.isbn13);
            if (converted) {
              bookData.isbn = converted;
            } else {
              bookData.isbn = ndlData.isbn13;
            }
          }
        }
      } catch (error) {
        console.error('NDL API fallback error:', error);
      }
    }

    const amazonUrl = `https://www.amazon.co.jp/dp/${bookData.isbn}`;
    bookData.paper_available = true;
    bookData.paper_links.amazon = amazonUrl;

    if (!bookData.title) {
      console.error('No book data found for ISBN:', isbn);
      console.error('Final bookData:', JSON.stringify(bookData));
      return new Response(
        JSON.stringify({
          error: '\u66f8\u7c4d\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f',
          details: 'Google Books API\u3001Rakuten API\u3001\u304a\u3088\u3073\u56fd\u4f1a\u56f3\u66f8\u9928API\u304b\u3089\u66f8\u7c4d\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f'
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(JSON.stringify(bookData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
