import { expect } from '@oclif/test';
import { toArray, jsonStringify, unescapeHtml, objectPurge, toPascalCase, toUpperSnakeCase } from '../src/utils';

describe('utils', () => {
    it('toArray()', () => {
        const test1 = { foo: 'bar' };
        const test2 = ['foo', 'bar'];
        expect(toArray(test1)).to.lengthOf(1);
        expect(toArray(test2)).to.lengthOf(2);
    });

    it('jsonStringify()', () => {
        const test1 = { name: 'name', purge: undefined };
        const test2 = { name: undefined, purge: undefined };
        expect(jsonStringify(test1, ' ')).to.equal('value');
        expect(jsonStringify(test2, ' ')).to.equal('<value>');
    });

    it('unescapeHtml()', () => {
        const test1 = 'value';
        const test2 = '&lt;value&rt;';
        expect(unescapeHtml(test1)).to.equal('value');
        expect(unescapeHtml(test2)).to.equal('<value>');
    });

    it('objectPurge()', () => {
        const test1 = { name: 'name', purge: undefined };
        const test2 = { name: undefined, purge: undefined };
        expect(objectPurge(test1)).to.equal({ name: 'name' });
        expect(objectPurge(test2)).to.equal({});
    });

    it('toPascalCase()', () => {
        const test1 = 'recordUpdate';
        const test2 = 'createDraftFromOnlineKnowledgeArticle';
        expect(toPascalCase(test1)).to.equal('RecordUpdate');
        expect(toPascalCase(test2)).to.equal('CreateDraftFromOnlineKnowledgeArticle');
    });

    it('toUpperSnakeCase()', () => {
        const test1 = 'recordUpdate';
        const test2 = 'createDraftFromOnlineKnowledgeArticle';
        expect(toUpperSnakeCase(test1)).to.equal('RECORD_UPDATE');
        expect(toUpperSnakeCase(test2)).to.equal('CREATE_DRAFT_FROM_ONLINE_KNOWLEDGE_ARTICLE');
    });
});
