import 'package:flutter_test/flutter_test.dart';
import 'package:tabyldy/core/models.dart';
import 'package:tabyldy/features/listing/ai_fill.dart';
import 'package:tabyldy/features/listing/listing_draft.dart';

const cats = [
  Category(id: 'c-w', slug: 'wallets', nameRu: 'Кошельки', nameKy: 'Капчыктар', icon: 'wallet', sensitive: false, publicationPolicy: 'standard'),
  Category(id: 'c-b', slug: 'bags', nameRu: 'Сумки', nameKy: 'Сумкалар', icon: 'backpack', sensitive: false, publicationPolicy: 'standard'),
];

void main() {
  test('photo suggestions fill an empty form in the chosen language', () {
    final d = ListingDraft(type: 'FOUND');
    final changed = applyPhotoSuggestions(d, {
      'categorySlug': 'wallets', 'confidence': 0.9, 'color': 'black', 'brand': 'Apple', 'model': 'iPhone',
      'titleRu': 'Найден чёрный кошелёк', 'titleKy': 'Кара капчык табылды',
    }, cats, 'ky');
    expect(changed, isTrue);
    expect(d.categoryId, 'c-w');
    expect(d.color, 'black');
    expect(d.brand, 'Apple iPhone');
    expect(d.title, 'Кара капчык табылды');
    expect(d.detailsReady, isTrue);
  });

  test('an unsure category is only offered as a hint', () {
    final d = ListingDraft(type: 'FOUND');
    applyPhotoSuggestions(d, {'categorySlug': 'bags', 'confidence': 0.4}, cats, 'ru');
    expect(d.categoryId, isNull);
    expect(d.suggestedCategorySlug, 'bags');
  });

  test('a retake replaces AI values but never what the person chose or typed', () {
    final d = ListingDraft(type: 'FOUND');
    applyPhotoSuggestions(d, {'categorySlug': 'wallets', 'confidence': 0.9, 'color': 'black', 'titleRu': 'Найден чёрный кошелёк'}, cats, 'ru');
    d.color = 'red';
    d.manual.add('color');
    applyPhotoSuggestions(d, {'categorySlug': 'bags', 'confidence': 0.9, 'color': 'blue', 'titleRu': 'Найдена синяя сумка'}, cats, 'ru');
    expect(d.categoryId, 'c-b');
    expect(d.title, 'Найдена синяя сумка');
    expect(d.color, 'red');
  });

  test('text hints pick category and colour unless set by hand', () {
    final d = ListingDraft(type: 'LOST');
    expect(applyTextHints(d, const TextHints(categorySlug: 'wallets', color: 'black'), cats), isTrue);
    expect(d.categoryId, 'c-w');
    d.categoryId = 'c-b';
    d.manual.add('category');
    applyTextHints(d, const TextHints(categorySlug: 'wallets'), cats);
    expect(d.categoryId, 'c-b');
  });
}
