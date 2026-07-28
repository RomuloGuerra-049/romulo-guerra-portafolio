import pg from "pg";

const { Pool } = pg;

function iso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    serviceType: row.service_type,
    status: row.status,
    progress: row.progress,
    priority: row.priority,
    estimatedDelivery: row.estimated_delivery
      ? String(row.estimated_delivery).slice(0, 10)
      : "",
    budget: Number(row.budget),
    collaboratorIds: row.collaborator_ids ?? [],
    stages: row.stages ?? [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapProjectRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    company: row.company ?? "",
    description: row.description,
    objective: row.objective,
    projectType: row.project_type,
    approximateBudget: row.approximate_budget ?? "",
    desiredDate: row.desired_date ? String(row.desired_date).slice(0, 10) : "",
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapChangeRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    title: row.title,
    description: row.description,
    type: row.request_type,
    priority: row.priority,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.notification_type,
    title: row.title,
    message: row.message,
    resourceId: row.resource_id,
    read: Boolean(row.read_at),
    createdAt: iso(row.created_at),
  };
}

function mapActivity(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    description: row.description,
    createdAt: iso(row.created_at),
  };
}

function mapPortfolioItem(row, includeImage = false) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    technologies: row.technologies ?? [],
    demoUrl: row.demo_url ?? "",
    repositoryUrl: row.repository_url ?? "",
    imageUrl: row.image_data ? `/api/portfolio/${row.id}/image` : "",
    imageMime: row.image_mime ?? "",
    published: Boolean(row.published),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    ...(includeImage ? { imageData: row.image_data } : {}),
  };
}

async function projectSelect(client, where = "", params = []) {
  const result = await client.query(
    `SELECT p.*,
      COALESCE((
        SELECT json_agg(pm.user_id)
        FROM project_members pm
        WHERE pm.project_id = p.id
      ), '[]'::json) AS collaborator_ids,
      COALESCE((
        SELECT json_agg(
          json_build_object('name', ps.name, 'status', ps.status)
          ORDER BY ps.position
        )
        FROM project_stages ps
        WHERE ps.project_id = p.id
      ), '[]'::json) AS stages
    FROM projects p ${where}`,
    params,
  );
  return result.rows.map(mapProject);
}

export function createPostgresRepositories(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  return {
    pool,
    async close() {
      await pool.end();
    },
    async health() {
      await pool.query("SELECT 1");
      return true;
    },
    users: {
      async findByEmail(email) {
        const result = await pool.query(
          "SELECT * FROM users WHERE email = $1 LIMIT 1",
          [email],
        );
        return mapUser(result.rows[0]);
      },
      async findById(id) {
        const result = await pool.query(
          "SELECT * FROM users WHERE id = $1 LIMIT 1",
          [id],
        );
        return mapUser(result.rows[0]);
      },
      async create(user) {
        try {
          const result = await pool.query(
            `INSERT INTO users
              (id, name, email, password_hash, role, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
             RETURNING *`,
            [
              user.id,
              user.name,
              user.email,
              user.passwordHash,
              user.role,
              user.status,
              user.createdAt,
            ],
          );
          return mapUser(result.rows[0]);
        } catch (error) {
          if (error.code === "23505") error.code = "EMAIL_EXISTS";
          throw error;
        }
      },
      async list() {
        const result = await pool.query(
          "SELECT * FROM users ORDER BY created_at DESC",
        );
        return result.rows.map(mapUser);
      },
      async update(id, changes) {
        const fields = [];
        const values = [];
        if (changes.status !== undefined) {
          values.push(changes.status);
          fields.push(`status = $${values.length}`);
        }
        if (!fields.length) return this.findById(id);
        values.push(id);
        const result = await pool.query(
          `UPDATE users
           SET ${fields.join(", ")}, updated_at = now()
           WHERE id = $${values.length}
           RETURNING *`,
          values,
        );
        return mapUser(result.rows[0]);
      },
    },
    sessions: {
      async create(session) {
        await pool.query(
          `INSERT INTO sessions
            (id, user_id, token_hash, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            session.id,
            session.userId,
            session.tokenHash,
            session.expiresAt,
            session.createdAt,
          ],
        );
      },
      async findByTokenHash(tokenHash) {
        const result = await pool.query(
          "SELECT * FROM sessions WHERE token_hash = $1 LIMIT 1",
          [tokenHash],
        );
        const row = result.rows[0];
        return row
          ? {
              id: row.id,
              userId: row.user_id,
              tokenHash: row.token_hash,
              expiresAt: iso(row.expires_at),
              createdAt: iso(row.created_at),
            }
          : null;
      },
      async deleteByTokenHash(tokenHash) {
        await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
      },
      async deleteExpired(now = new Date()) {
        await pool.query("DELETE FROM sessions WHERE expires_at <= $1", [now]);
      },
    },
    contacts: {
      async create(contact) {
        const result = await pool.query(
          `INSERT INTO contacts
            (id, name, email, subject, message, delivery_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            contact.id,
            contact.name,
            contact.email,
            contact.subject,
            contact.message,
            contact.deliveryStatus ?? "pending",
            contact.createdAt,
          ],
        );
        return result.rows[0];
      },
      async update(id, changes) {
        const deliveredAt = changes.deliveryStatus === "sent" ? new Date() : null;
        const result = await pool.query(
          `UPDATE contacts
           SET delivery_status = $2, delivery_error = $3, delivered_at = $4
           WHERE id = $1
           RETURNING *`,
          [
            id,
            changes.deliveryStatus,
            changes.deliveryError ?? null,
            deliveredAt,
          ],
        );
        return result.rows[0] ?? null;
      },
      async list() {
        const result = await pool.query(
          `SELECT id, name, email, subject, message, delivery_status,
                  delivery_error, created_at, delivered_at
           FROM contacts ORDER BY created_at DESC`,
        );
        return result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          subject: row.subject,
          message: row.message,
          deliveryStatus: row.delivery_status,
          deliveryError: row.delivery_error,
          createdAt: iso(row.created_at),
          deliveredAt: iso(row.delivered_at),
        }));
      },
      async delete(id) {
        const result = await pool.query(
          "DELETE FROM contacts WHERE id = $1 RETURNING id",
          [id],
        );
        return Boolean(result.rowCount);
      },
    },
    portfolioItems: {
      async create(item) {
        const result = await pool.query(
          `INSERT INTO portfolio_items
            (id, title, description, technologies, demo_url, repository_url,
             image_data, image_mime, published, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
           RETURNING *`,
          [
            item.id,
            item.title,
            item.description,
            item.technologies,
            item.demoUrl || null,
            item.repositoryUrl || null,
            item.imageData || null,
            item.imageMime || null,
            item.published,
            item.createdAt,
          ],
        );
        return mapPortfolioItem(result.rows[0]);
      },
      async list({ includeUnpublished = false } = {}) {
        const result = await pool.query(
          `SELECT * FROM portfolio_items
           ${includeUnpublished ? "" : "WHERE published = true"}
           ORDER BY created_at DESC`,
        );
        return result.rows.map((row) => mapPortfolioItem(row));
      },
      async findImage(id) {
        const result = await pool.query(
          "SELECT image_data, image_mime FROM portfolio_items WHERE id = $1",
          [id],
        );
        return result.rows[0] ?? null;
      },
      async delete(id) {
        const result = await pool.query(
          "DELETE FROM portfolio_items WHERE id = $1 RETURNING id",
          [id],
        );
        return Boolean(result.rowCount);
      },
    },
    chatMessages: {
      async create(message) {
        const result = await pool.query(
          `INSERT INTO chat_messages
            (id, session_id, sender, message, language, delivery_status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING *`,
          [
            message.id,
            message.sessionId,
            message.sender,
            message.message,
            message.language,
            message.deliveryStatus,
            message.createdAt,
          ],
        );
        return result.rows[0];
      },
    },
    projects: {
      async create(project) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `INSERT INTO projects
              (id, client_id, name, description, service_type, status, progress,
               priority, estimated_delivery, budget, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
            [
              project.id,
              project.clientId,
              project.name,
              project.description,
              project.serviceType,
              project.status,
              project.progress,
              project.priority,
              project.estimatedDelivery || null,
              project.budget,
              project.createdAt,
            ],
          );
          for (const [position, stage] of project.stages.entries()) {
            await client.query(
              `INSERT INTO project_stages
                (project_id, name, status, position)
               VALUES ($1, $2, $3, $4)`,
              [project.id, stage.name, stage.status, position],
            );
          }
          for (const userId of project.collaboratorIds) {
            await client.query(
              `INSERT INTO project_members (project_id, user_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [project.id, userId],
            );
          }
          await client.query("COMMIT");
          return (await projectSelect(pool, "WHERE p.id = $1", [project.id]))[0];
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
      async findById(id) {
        return (await projectSelect(pool, "WHERE p.id = $1", [id]))[0] ?? null;
      },
      async list(predicate = () => true) {
        return (await projectSelect(pool, "ORDER BY p.created_at DESC")).filter(
          predicate,
        );
      },
      async update(id, changes) {
        const fields = [];
        const values = [];
        for (const [key, column] of [
          ["status", "status"],
          ["progress", "progress"],
          ["updatedAt", "updated_at"],
        ]) {
          if (changes[key] !== undefined) {
            values.push(changes[key]);
            fields.push(`${column} = $${values.length}`);
          }
        }
        if (fields.length) {
          values.push(id);
          await pool.query(
            `UPDATE projects SET ${fields.join(", ")}
             WHERE id = $${values.length}`,
            values,
          );
        }
        return this.findById(id);
      },
    },
    projectRequests: {
      async create(record) {
        const result = await pool.query(
          `INSERT INTO project_requests
            (id, client_id, name, company, description, objective, project_type,
             approximate_budget, desired_date, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
           RETURNING *`,
          [
            record.id,
            record.clientId,
            record.name,
            record.company || null,
            record.description,
            record.objective,
            record.projectType,
            record.approximateBudget || null,
            record.desiredDate || null,
            record.status,
            record.createdAt,
          ],
        );
        return mapProjectRequest(result.rows[0]);
      },
      async findById(id) {
        const result = await pool.query(
          "SELECT * FROM project_requests WHERE id = $1",
          [id],
        );
        return mapProjectRequest(result.rows[0]);
      },
      async list(predicate = () => true) {
        const result = await pool.query(
          "SELECT * FROM project_requests ORDER BY created_at DESC",
        );
        return result.rows.map(mapProjectRequest).filter(predicate);
      },
      async update() {
        return null;
      },
    },
    changeRequests: {
      async create(record) {
        const result = await pool.query(
          `INSERT INTO change_requests
            (id, project_id, client_id, title, description, request_type,
             priority, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
           RETURNING *`,
          [
            record.id,
            record.projectId,
            record.clientId,
            record.title,
            record.description,
            record.type,
            record.priority,
            record.status,
            record.createdAt,
          ],
        );
        return mapChangeRequest(result.rows[0]);
      },
      async findById(id) {
        const result = await pool.query(
          "SELECT * FROM change_requests WHERE id = $1",
          [id],
        );
        return mapChangeRequest(result.rows[0]);
      },
      async list(predicate = () => true) {
        const result = await pool.query(
          "SELECT * FROM change_requests ORDER BY created_at DESC",
        );
        return result.rows.map(mapChangeRequest).filter(predicate);
      },
      async update() {
        return null;
      },
    },
    notifications: {
      async create(record) {
        const result = await pool.query(
          `INSERT INTO notifications
            (id, user_id, notification_type, title, message, resource_id,
             read_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING *`,
          [
            record.id,
            record.userId,
            record.type,
            record.title,
            record.message,
            record.resourceId ?? null,
            record.read ? record.createdAt : null,
            record.createdAt,
          ],
        );
        return mapNotification(result.rows[0]);
      },
      async findById(id) {
        const result = await pool.query(
          "SELECT * FROM notifications WHERE id = $1",
          [id],
        );
        return mapNotification(result.rows[0]);
      },
      async list(predicate = () => true) {
        const result = await pool.query(
          "SELECT * FROM notifications ORDER BY created_at DESC",
        );
        return result.rows.map(mapNotification).filter(predicate);
      },
      async update(id, changes) {
        if (changes.read !== undefined) {
          const result = await pool.query(
            `UPDATE notifications
             SET read_at = CASE WHEN $2 THEN now() ELSE NULL END
             WHERE id = $1 RETURNING *`,
            [id, changes.read],
          );
          return mapNotification(result.rows[0]);
        }
        return this.findById(id);
      },
    },
    activity: {
      async create(record) {
        const result = await pool.query(
          `INSERT INTO activity_logs
            (id, user_id, action, resource, resource_id, description, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING *`,
          [
            record.id,
            record.userId,
            record.action,
            record.resource,
            record.resourceId,
            record.description,
            record.createdAt,
          ],
        );
        return mapActivity(result.rows[0]);
      },
      async findById(id) {
        const result = await pool.query(
          "SELECT * FROM activity_logs WHERE id = $1",
          [id],
        );
        return mapActivity(result.rows[0]);
      },
      async list(predicate = () => true) {
        const result = await pool.query(
          "SELECT * FROM activity_logs ORDER BY created_at DESC",
        );
        return result.rows.map(mapActivity).filter(predicate);
      },
      async update() {
        return null;
      },
    },
  };
}
