import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async search(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('subject') subject?: string,
    @Query('semester') semester?: number,
    @Query('branch') branch?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.globalSearch(query, { type, subject, semester, branch, page, limit });
  }
}
