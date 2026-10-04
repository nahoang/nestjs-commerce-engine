import {
  ok,
  paginated,
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
} from './envelope';

describe('Envelope Helpers & Classes', () => {
  describe('ok helper', () => {
    it('should wrap data in standard ApiResponse with default success message', () => {
      const data = { id: 'prod-123', name: 'Product A' };
      const response = ok(data);

      expect(response).toBeInstanceOf(ApiResponse);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('success');
    });

    it('should support custom success messages', () => {
      const response = ok({ id: 'order-1' }, 'Order placed successfully');

      expect(response.data).toEqual({ id: 'order-1' });
      expect(response.message).toBe('Order placed successfully');
    });
  });

  describe('paginated helper', () => {
    it('should calculate page=3 and has_next=false when total=5, limit=2, offset=4', () => {
      const items = ['item5'];
      const response = paginated(items, 5, 2, 4);

      expect(response).toBeInstanceOf(PaginatedResponse);
      expect(response.data).toEqual(items);
      expect(response.total).toBe(5);
      expect(response.page_size).toBe(2);
      expect(response.page).toBe(3);
      expect(response.has_next).toBe(false);
    });

    it('should calculate page=1 and has_next=true when total=5, limit=2, offset=0', () => {
      const items = ['item1', 'item2'];
      const response = paginated(items, 5, 2, 0);

      expect(response.page).toBe(1);
      expect(response.page_size).toBe(2);
      expect(response.has_next).toBe(true);
      expect(response.total).toBe(5);
    });

    it('should calculate page=2 and has_next=true when total=5, limit=2, offset=2', () => {
      const items = ['item3', 'item4'];
      const response = paginated(items, 5, 2, 2);

      expect(response.page).toBe(2);
      expect(response.page_size).toBe(2);
      expect(response.has_next).toBe(true);
      expect(response.total).toBe(5);
    });

    it('should handle empty collections with page=1 and has_next=false', () => {
      const response = paginated([], 0, 20, 0);

      expect(response.page).toBe(1);
      expect(response.page_size).toBe(20);
      expect(response.has_next).toBe(false);
      expect(response.total).toBe(0);
      expect(response.data).toEqual([]);
    });

    it('should fallback to safe default limit when non-positive limit is passed', () => {
      const response = paginated(['a'], 1, 0, 0);

      expect(response.page_size).toBe(20);
      expect(response.page).toBe(1);
      expect(response.has_next).toBe(false);
    });
  });

  describe('ErrorResponse class', () => {
    it('should instantiate error response with detail and error_code', () => {
      const error = new ErrorResponse('Resource not found', 'NOT_FOUND');

      expect(error.detail).toBe('Resource not found');
      expect(error.error_code).toBe('NOT_FOUND');
      expect(error.errors).toBeUndefined();
    });

    it('should include validation error items when provided', () => {
      const validationErrors = [
        { field: 'limit', message: 'limit must not be less than 1' },
      ];
      const error = new ErrorResponse(
        'Request validation failed',
        'VALIDATION_ERROR',
        validationErrors,
      );

      expect(error.errors).toEqual(validationErrors);
      expect(error.error_code).toBe('VALIDATION_ERROR');
    });
  });
});
