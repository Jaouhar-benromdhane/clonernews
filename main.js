const HACKER_NEWS_API = "https://hacker-news.firebaseio.com/v0";
const POSTS_PER_PAGE = 10;

const state = {
  posts: [],
  page: 0,
  liveUpdates: [],
  loading: false,
  postTypes: ["topstories", "jobstories", "newstories"],
};

// Fetch story IDs
async function fetchPostIds(type = "topstories") {
  const response = await fetch(`${HACKER_NEWS_API}/${type}.json`);
  return await response.json();
}

// Fetch details of a list of posts
async function fetchPostDetails(ids) {
  if (!Array.isArray(ids)) return [];
  const postPromises = ids.map(async (id) => {
    const response = await fetch(`${HACKER_NEWS_API}/item/${id}.json`);
    return await response.json();
  });
  return Promise.all(postPromises);
}

// Load more posts
async function loadMorePosts() {
  if (state.loading) return;

  state.loading = true;
  try {
    const allPosts = [];
    for (const type of state.postTypes) {
      const postIds = await fetchPostIds(type);
      const startIndex = state.page * POSTS_PER_PAGE;
      const endIndex = startIndex + POSTS_PER_PAGE;
      const pageIds = postIds.slice(startIndex, endIndex);

      const typePosts = await fetchPostDetails(pageIds);
      allPosts.push(...typePosts);
    }

    // Sort by time (newest first)
    allPosts.sort((a, b) => b.time - a.time);
    state.posts = [...state.posts, ...allPosts];
    state.page++;

    renderPosts(allPosts);
  } catch (error) {
    console.error("Erreur de chargement:", error);
  } finally {
    state.loading = false;
  }
}

// Render posts in the DOM
function renderPosts(posts) {
  const postsContainer = document.getElementById("posts-container");
  posts.forEach((post) => {
    const postElement = document.createElement("div");
    postElement.classList.add("post");
    postElement.dataset.id = post.id;
    postElement.innerHTML = `
      <h3 class="post-title">${post.title || "Sans titre"}</h3>
      <div class="post-meta">
        Type: ${post.type} | Par ${post.by || "Anonyme"} | ${new Date(
      post.time * 1000
    ).toLocaleString()}
      </div>
    `;
    postElement.addEventListener("click", () => openPostDetail(post));
    postsContainer.appendChild(postElement);
  });
}

// Open post detail view
async function openPostDetail(post) {
  const postDetailContainer = document.getElementById("post-detail");
  postDetailContainer.style.display = "block";

  // Fetch and sort comments (newest first)
  let comments = [];
  if (post.kids) {
    comments = await fetchPostDetails(post.kids);
    comments.sort((a, b) => b.time - a.time);
  }

  postDetailContainer.innerHTML = `
                <div style="background:white; padding:20px; border-radius:10px;">
                <a href="${post.url}">
                        ${post.title}
                    </a>

                    <p>${post.text || "Aucun texte"}</p>
                    <h3>Commentaires (${comments.length})</h3>
                    ${comments
                      .map(
                        (comment) => `
                        <div class="comment">
                            <strong>${comment.by}</strong>
                            <p>${comment.text || "Pas de texte"}</p>
                        </div>
                    `
                      )
                      .join("")}
                    <button onclick="document.getElementById('post-detail').style.display='none'">Fermer</button>
                </div>
            `;
}

async function startLiveUpdates() {
  setInterval(async () => {
    const newUpdates = [];
    console.log("Vérification des mises à jour en direct...");

    try {
      for (const type of state.postTypes) {
        const latestPostIds = await fetchPostIds(type);
        const mostRecentPostId = latestPostIds[0]; // Le post le plus récent est le premier dans la liste

        // Vérifie si ce post est déjà présent dans le state
        if (!state.posts.some((post) => post.id === mostRecentPostId)) {
          const [newPost] = await fetchPostDetails([mostRecentPostId]); // Récupère uniquement le post le plus récent
          if (newPost) {
            newUpdates.push(newPost);
          }
        }
      }

      if (newUpdates.length > 0) {
        console.log("news");

        // Met à jour le state avec les nouveaux posts
        state.liveUpdates = [...newUpdates, ...state.liveUpdates];
        state.posts = [...newUpdates, ...state.posts];

        // Ajoute les nouveaux posts à l'interface
        const postsContainer = document.getElementById("posts-container");
        const postElement = document.createElement("div");
        postElement.classList.add("post");
        postElement.dataset.id = newUpdates[0].id;
        postElement.innerHTML = `
      <h3 class="post-title">${newUpdates[0].title || "Sans titre"}</h3>
      <div class="post-meta">
        Type: ${newUpdates[0].type} | Par ${
          newUpdates[0].by || "Anonyme"
        } | ${new Date(newUpdates[0].time * 1000).toLocaleString()}
      </div>
    `;
        postElement.addEventListener("click", () =>
          openPostDetail(newUpdates[0])
        );
        postsContainer.insertBefore(postElement, postsContainer.firstChild);
        // Affiche une notification pour le dernier post ajouté
        const notification = document.getElementById("live-notification");
        notification.innerText = `Nouvelle histoire: ${newUpdates[0].title}`;
        notification.style.display = "block";

        setTimeout(() => {
          notification.style.display = "none";
        }, 3000); // Notification visible pendant 3 secondes
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour en direct:", error);
    }
  }, 5000); // Vérifie les mises à jour toutes les 5 secondes
}

// Event listeners
document.getElementById("load-more").addEventListener("click", loadMorePosts);

// Initialize
loadMorePosts();
startLiveUpdates();
