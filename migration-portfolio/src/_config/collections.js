export default {
  projects: function (collectionApi) {
    return collectionApi.getFilteredByGlob('src/projects/**/*.md');
  },
  games: function (collectionApi) {
    return collectionApi.getFilteredByGlob('src/games/**/*.md');
  },
  published: function (collectionApi) {
    const now = new Date();

    return collectionApi.getFilteredByGlob('src/posts/**/*.md').filter(post => {

      // console.log(`Post: ${post.fileSlug}, Date: ${post.date}, Type: ${typeof post.date}`);

      // Draft Check
      if (post.data.draft === true) { return false; }

      // Future Check
      const postDate = new Date(post.date);
      if (postDate > now) { return false; }

      return true;
    });
  },
  notesPublished: function (collectionApi) {
    const now = new Date();

    return collectionApi.getFilteredByGlob('src/notes/**/*.md').filter(note => {

      // console.log(`note: ${note.fileSlug}, Date: ${note.date}, Type: ${typeof note.date}`);

      // Draft Check
      if (note.data.draft === true) { return false; }

      // Future Check
      const noteDate = new Date(note.date);
      if (noteDate > now) { return false; }

      return true;
    });
  }
};