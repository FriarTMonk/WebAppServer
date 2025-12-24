import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { GoogleBooksProvider } from './google-books.provider';
import { of } from 'rxjs';

describe('GoogleBooksProvider', () => {
  let provider: GoogleBooksProvider;
  let httpService: HttpService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GoogleBooksProvider,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<GoogleBooksProvider>(GoogleBooksProvider);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('supports', () => {
    it('should support ISBN identifiers', () => {
      expect(provider.supports('978-0060652920')).toBe(true);
      expect(provider.supports('9780060652920')).toBe(true);
      expect(provider.supports('0060652926')).toBe(true);
    });

    it('should not support URLs', () => {
      expect(provider.supports('https://amazon.com/book')).toBe(false);
    });
  });

  describe('lookup', () => {
    it('should fetch book metadata by ISBN', async () => {
      const mockResponse = {
        data: {
          items: [{
            volumeInfo: {
              title: 'Mere Christianity',
              authors: ['C.S. Lewis'],
              publisher: 'HarperOne',
              publishedDate: '2001',
              description: 'A classic work',
              imageLinks: { thumbnail: 'https://example.com/cover.jpg' },
            },
          }],
        },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse) as any);

      const result = await provider.lookup('9780060652920');

      expect(result).toEqual({
        title: 'Mere Christianity',
        author: 'C.S. Lewis',
        publisher: 'HarperOne',
        publicationYear: 2001,
        description: 'A classic work',
        coverImageUrl: 'https://example.com/cover.jpg',
        isbn: '9780060652920',
      });
    });

    it('should return null if no results', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of({ data: { items: [] } }) as any);

      const result = await provider.lookup('0000000000');

      expect(result).toBeNull();
    });
  });
});
