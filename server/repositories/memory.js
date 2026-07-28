/**
 * Adaptadores temporales para desarrollo.
 *
 * Conserva las interfaces al crear los adaptadores de tu base de datos:
 * - users: findByEmail, findById, create
 * - sessions: create, findByTokenHash, deleteByTokenHash, deleteExpired
 * - contacts: create
 * - projects, projectRequests, changeRequests, notifications, activity:
 *   create, findById, list y update
 */
export function createMemoryRepositories() {
  const usersById = new Map();
  const userIdByEmail = new Map();
  const sessions = new Map();
  const contacts = new Map();
  const projects = new Map();
  const projectRequests = new Map();
  const changeRequests = new Map();
  const notifications = new Map();
  const activity = new Map();
  const portfolioItems = new Map();
  const chatMessages = new Map();

  function collection(map) {
    return {
      async create(record) {
        map.set(record.id, structuredClone(record));
        return structuredClone(record);
      },
      async findById(id) {
        const record = map.get(id);
        return record ? structuredClone(record) : null;
      },
      async list(predicate = () => true) {
        return [...map.values()]
          .filter(predicate)
          .map((record) => structuredClone(record));
      },
      async update(id, changes) {
        const current = map.get(id);
        if (!current) return null;
        const updated = { ...current, ...structuredClone(changes) };
        map.set(id, updated);
        return structuredClone(updated);
      },
    };
  }

  return {
    users: {
      async findByEmail(email) {
        const id = userIdByEmail.get(email);
        return id ? structuredClone(usersById.get(id)) : null;
      },
      async findById(id) {
        const user = usersById.get(id);
        return user ? structuredClone(user) : null;
      },
      async create(user) {
        if (userIdByEmail.has(user.email)) {
          const error = new Error("EMAIL_EXISTS");
          error.code = "EMAIL_EXISTS";
          throw error;
        }
        usersById.set(user.id, structuredClone(user));
        userIdByEmail.set(user.email, user.id);
        return structuredClone(user);
      },
      async list() {
        return [...usersById.values()].map((user) => structuredClone(user));
      },
      async update(id, changes) {
        const current = usersById.get(id);
        if (!current) return null;
        const updated = { ...current, ...structuredClone(changes) };
        usersById.set(id, updated);
        return structuredClone(updated);
      },
    },
    sessions: {
      async create(session) {
        sessions.set(session.tokenHash, structuredClone(session));
      },
      async findByTokenHash(tokenHash) {
        const session = sessions.get(tokenHash);
        return session ? structuredClone(session) : null;
      },
      async deleteByTokenHash(tokenHash) {
        sessions.delete(tokenHash);
      },
      async deleteExpired(now = new Date()) {
        for (const [tokenHash, session] of sessions) {
          if (new Date(session.expiresAt) <= now) sessions.delete(tokenHash);
        }
      },
    },
    contacts: {
      async create(contact) {
        contacts.set(contact.id, structuredClone(contact));
        return structuredClone(contact);
      },
      async update(id, changes) {
        const current = contacts.get(id);
        if (!current) return null;
        const updated = { ...current, ...structuredClone(changes) };
        contacts.set(id, updated);
        return structuredClone(updated);
      },
      async list() {
        return [...contacts.values()].map((contact) => structuredClone(contact));
      },
      async delete(id) {
        return contacts.delete(id);
      },
    },
    portfolioItems: {
      async create(item) {
        portfolioItems.set(item.id, structuredClone(item));
        const { imageData, ...safe } = item;
        return structuredClone({ ...safe, imageUrl: imageData ? `/api/portfolio/${item.id}/image` : "" });
      },
      async list({ includeUnpublished = false } = {}) {
        return [...portfolioItems.values()]
          .filter((item) => includeUnpublished || item.published)
          .map(({ imageData, ...item }) => ({
            ...structuredClone(item),
            imageUrl: imageData ? `/api/portfolio/${item.id}/image` : "",
          }));
      },
      async findImage(id) {
        const item = portfolioItems.get(id);
        return item?.imageData
          ? { image_data: Buffer.from(item.imageData), image_mime: item.imageMime }
          : null;
      },
      async delete(id) {
        return portfolioItems.delete(id);
      },
    },
    chatMessages: collection(chatMessages),
    projects: collection(projects),
    projectRequests: collection(projectRequests),
    changeRequests: collection(changeRequests),
    notifications: collection(notifications),
    activity: collection(activity),
  };
}
