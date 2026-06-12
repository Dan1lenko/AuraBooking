import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

const mockReviewsService = {
  create: jest.fn(),
  findForSpecialist: jest.fn(),
};

describe('ReviewsController', () => {
  let controller: ReviewsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: ReviewsService, useValue: mockReviewsService },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  describe('createReview', () => {
    it('should call reviewsService.create with correct parameters', async () => {
      const mockReq = { user: { id: 3 } };
      const mockDto = { bookingId: 1, rating: 5, comment: 'Great!' };
      const expectedResult = { id: 10, ...mockDto, clientId: 3 };
      mockReviewsService.create.mockResolvedValue(expectedResult);

      const result = await controller.createReview(mockReq, mockDto);

      expect(result).toEqual(expectedResult);
      expect(mockReviewsService.create).toHaveBeenCalledWith(3, mockDto);
    });
  });

  describe('getSpecialistReviews', () => {
    it('should call reviewsService.findForSpecialist with correct parameters', async () => {
      const expectedReviews = [
        { id: 10, rating: 5, comment: 'Great!', clientId: 3, client: { name: 'Alice' } },
      ];
      mockReviewsService.findForSpecialist.mockResolvedValue(expectedReviews);

      const result = await controller.getSpecialistReviews(2);

      expect(result).toEqual(expectedReviews);
      expect(mockReviewsService.findForSpecialist).toHaveBeenCalledWith(2);
    });
  });
});
