export default {
  // posts: function (collectionApi) {
  //   return collectionApi.getFilteredByGlob('src/posts/**/*.md');
  // },
  projects: function (collectionApi) {
    return collectionApi.getFilteredByGlob('src/projects/**/*.md');
  },
  games: function (collectionApi) {
    return collectionApi.getFilteredByGlob('src/games/**/*.md');
  },
  published: function(collectionApi) {
    const now = new Date();

    // ERROR WAS HERE: Changed getFilteredByTag -> getFilteredByGlob
    // We must look at the file path, just like the 'posts' collection above.
    return collectionApi.getFilteredByGlob('src/posts/**/*.md').filter(post => {
      
      // 1. Debugging: If you suspect date issues, uncomment this to see what 11ty sees
      // console.log(`Post: ${post.fileSlug}, Date: ${post.date}, Type: ${typeof post.date}`);

      // 2. Draft Check
      if (post.data.draft === true) {
        return false; 
      }

      // 3. Future Check
      // We wrap post.date in new Date() just to be 100% safe against strings
      const postDate = new Date(post.date);
      
      if (postDate > now) {
        return false; 
      }

      return true;
    });
  },
  notesPublished: function(collectionApi) {
    const now = new Date();

    // ERROR WAS HERE: Changed getFilteredByTag -> getFilteredByGlob
    // We must look at the file path, just like the 'posts' collection above.
    return collectionApi.getFilteredByGlob('src/notes/**/*.md').filter(note => {
      
      // 1. Debugging: If you suspect date issues, uncomment this to see what 11ty sees
      // console.log(`note: ${note.fileSlug}, Date: ${note.date}, Type: ${typeof note.date}`);

      // 2. Draft Check
      if (note.data.draft === true) {
        return false; 
      }

      // 3. Future Check
      // We wrap note.date in new Date() just to be 100% safe against strings
      const noteDate = new Date(note.date);
      
      if (noteDate > now) {
        return false; 
      }

      return true;
    });
  }
};