import { parseEventLocation } from '../src/utils/eventLocationParser';

describe('parseEventLocation', () => {
  describe('invalid or empty input', () => {
    it('returns null building and room for null', () => {
      expect(parseEventLocation(null)).toEqual({ building: null, room: null });
    });

    it('returns null building and room for undefined', () => {
      expect(parseEventLocation(undefined)).toEqual({ building: null, room: null });
    });

    it('returns null building and room for empty string', () => {
      expect(parseEventLocation('')).toEqual({ building: null, room: null });
    });

    it('returns null building and room for non-string', () => {
      expect(parseEventLocation(123)).toEqual({ building: null, room: null });
    });
  });

  describe('code + room format (e.g. "H 435", "EV 213")', () => {
    it('parses "H 435"', () => {
      expect(parseEventLocation('H 435')).toEqual({ building: 'H', room: '435' });
    });

    it('parses "EV 213"', () => {
      expect(parseEventLocation('EV 213')).toEqual({ building: 'EV', room: '213' });
    });

    it('parses "H-432"', () => {
      expect(parseEventLocation('H-432')).toEqual({ building: 'H', room: '432' });
    });

    it('parses "H435" without space', () => {
      expect(parseEventLocation('H435')).toEqual({ building: 'H', room: '435' });
    });

    it('parses room with letter prefix "EV S2.230"', () => {
      expect(parseEventLocation('EV S2.230')).toEqual({ building: 'EV', room: 'S2.230' });
    });

    it('parses room with letter prefix "H B090"', () => {
      expect(parseEventLocation('H B090')).toEqual({ building: 'H', room: 'B090' });
    });

    it('returns null building for unknown code (still extracts room)', () => {
      expect(parseEventLocation('XYZ 123')).toEqual({ building: null, room: '123' });
    });
  });

  describe('building name + room format', () => {
    it('parses "Hall Building 435"', () => {
      expect(parseEventLocation('Hall Building 435')).toEqual({ building: 'H', room: '435' });
    });

    it('parses "Hall Building, Room 435"', () => {
      expect(parseEventLocation('Hall Building, Room 435')).toEqual({ building: 'H', room: '435' });
    });

    it('parses "Engineering & Visual Arts 213"', () => {
      expect(parseEventLocation('Engineering & Visual Arts 213')).toEqual({ building: 'EV', room: '213' });
    });

    it('parses "Hall Building S2.230"', () => {
      expect(parseEventLocation('Hall Building S2.230')).toEqual({ building: 'H', room: 'S2.230' });
    });

    it('parses campus - building Rm XXX format (e.g. Google Calendar)', () => {
      expect(parseEventLocation('Sir George Williams Campus - Hall Building Rm 531')).toEqual({
        building: 'H',
        room: '531',
      });
    });
  });

  describe('multi-line or comma-separated', () => {
    it('parses "Hall Building\\n1455 Boulevard de Maisonneuve Ouest"', () => {
      expect(parseEventLocation('Hall Building\n1455 Boulevard de Maisonneuve Ouest')).toEqual({
        building: 'H',
        room: null,
      });
    });

    it('parses building name from first line when address on second', () => {
      const loc = 'Hall Building\n1455 De Maisonneuve Blvd W, Montreal, QC';
      expect(parseEventLocation(loc)).toEqual({ building: 'H', room: null });
    });
  });

  describe('address-only format', () => {
    it('parses "1455 De Maisonneuve Blvd W" as Hall', () => {
      expect(parseEventLocation('1455 De Maisonneuve Blvd W')).toEqual({ building: 'H', room: null });
    });

    it('parses French address "1455 Boulevard de Maisonneuve Ouest"', () => {
      expect(parseEventLocation('1455 Boulevard de Maisonneuve Ouest')).toEqual({
        building: 'H',
        room: null,
      });
    });

    it('parses "1190 Guy St" as Grey Nuns', () => {
      expect(parseEventLocation('1190 Guy St')).toEqual({ building: 'GN', room: null });
    });

    it('parses "1590 docteur penfield" as SB', () => {
      expect(parseEventLocation('1590 docteur penfield montreal')).toEqual({ building: 'SB', room: null });
    });

    it('parses address with number and street only', () => {
      expect(parseEventLocation('1455 de maisonneuve')).toEqual({ building: 'H', room: null });
    });

    it('parses address that matches multiple keys (picks longest match)', () => {
      // "1590 docteur penfield 1190 guy" matches both; sort picks longest -> SB
      expect(parseEventLocation('1590 docteur penfield 1190 guy')).toEqual({ building: 'SB', room: null });
    });
  });

  describe('building name without room', () => {
    it('parses "Hall Building"', () => {
      expect(parseEventLocation('Hall Building')).toEqual({ building: 'H', room: null });
    });

    it('parses "John Molson Building"', () => {
      expect(parseEventLocation('John Molson Building')).toEqual({ building: 'MB', room: null });
    });

    it('parses bare code "H" via KNOWN_CODES', () => {
      expect(parseEventLocation('H')).toEqual({ building: 'H', room: null });
    });

    it('parses building from second part when first does not match', () => {
      expect(parseEventLocation('Some prefix, Hall Building')).toEqual({ building: 'H', room: null });
    });

    it('parses code from second part when first does not match', () => {
      expect(parseEventLocation('Unknown, JW')).toEqual({ building: 'JW', room: null });
    });
  });

  describe('unparseable input', () => {
    it('returns null for random text', () => {
      expect(parseEventLocation('Random coffee shop')).toEqual({ building: null, room: null });
    });

    it('returns null for non-Concordia address', () => {
      expect(parseEventLocation('123 Fake Street, Montreal')).toEqual({ building: null, room: null });
    });
  });
});
