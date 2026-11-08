/** Keep parallel chats' acceptance artifacts separate from the default suite. */
export const collectionEvidencePrefix=process.env.WINUI_COLLECTION_TEST_URL?`collections-${new URL(process.env.WINUI_COLLECTION_TEST_URL).port||'default'}`:'collections';
