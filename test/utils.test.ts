import { expect } from '@oclif/test';
import { toArray, toUpperSnakeCase } from '../src/utils';

describe('utils', () => {
    it('toArray()', () => {
        const test1 = {
            foo: 'bar',
        };
        const test2 = ['foo', 'bar'];
        expect(toArray(test1)).to.lengthOf(1);
        expect(toArray(test2)).to.lengthOf(2);
    });

    it('toUpperSnakeCase()', () => {
        const test1 = 'recordUpdate';
        const test2 = 'createDraftFromOnlineKnowledgeArticle';
        expect(toUpperSnakeCase(test1)).to.equal('RECORD_UPDATE');
        expect(toUpperSnakeCase(test2)).to.equal('CREATE_DRAFT_FROM_ONLINE_KNOWLEDGE_ARTICLE');
    });
});
