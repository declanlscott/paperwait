import { eq, lte } from "drizzle-orm";

import { db } from "../drizzle";
import { organizationsTable } from "../organizations/sql";
import { usersTable } from "../users/sql";
import { sessionsTable } from "./sql";

import type { Adapter, DatabaseSession, DatabaseUser, UserId } from "lucia";
import type { Db } from "../drizzle";
import type { Organization, OrganizationsTable } from "../organizations/sql";
import type { User, UsersTable } from "../users/sql";
import type { Session, SessionsTable } from "./sql";

export class DbAdapter implements Adapter {
  private db: Db;

  private sessionsTable: SessionsTable;
  private usersTable: UsersTable;
  private organizationsTable: OrganizationsTable;

  constructor() {
    this.db = db;
    this.sessionsTable = sessionsTable;
    this.usersTable = usersTable;
    this.organizationsTable = organizationsTable;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.db
      .delete(this.sessionsTable)
      .where(eq(this.sessionsTable.id, sessionId));
  }

  public async deleteUserSessions(userId: UserId): Promise<void> {
    await this.db
      .delete(this.sessionsTable)
      .where(eq(this.sessionsTable.userId, userId));
  }

  public async getSessionAndUser(
    sessionId: string,
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const result = await this.db
      .select({
        user: this.usersTable,
        session: this.sessionsTable,
        org: this.organizationsTable,
      })
      .from(this.sessionsTable)
      .innerJoin(
        this.usersTable,
        eq(this.sessionsTable.userId, this.usersTable.id),
      )
      .innerJoin(
        this.organizationsTable,
        eq(this.sessionsTable.orgId, this.organizationsTable.id),
      )
      .where(eq(this.sessionsTable.id, sessionId))
      .then((rows) => rows.at(0));
    if (!result) return [null, null];

    return [
      transformIntoDatabaseSession(result.session),
      transformIntoDatabaseUser(result.user, result.org),
    ];
  }

  public async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    const sessions = await this.db
      .select()
      .from(this.sessionsTable)
      .where(eq(this.sessionsTable.userId, userId));

    return sessions.map((session) => transformIntoDatabaseSession(session));
  }

  public async setSession(session: DatabaseSession): Promise<void> {
    await this.db.insert(this.sessionsTable).values({
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      ...session.attributes,
    });
  }

  public async updateSessionExpiration(
    sessionId: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db
      .update(this.sessionsTable)
      .set({ expiresAt })
      .where(eq(this.sessionsTable.id, sessionId));
  }

  public async deleteExpiredSessions(): Promise<void> {
    await this.db
      .delete(this.sessionsTable)
      .where(lte(this.sessionsTable.expiresAt, new Date()));
  }
}

const transformIntoDatabaseSession = ({
  id,
  userId,
  expiresAt,
  ...attributes
}: Session): DatabaseSession => ({
  userId,
  id,
  expiresAt,
  attributes,
});

const transformIntoDatabaseUser = (
  user: User,
  org: Organization,
): DatabaseUser => ({
  id: user.id,
  attributes: {
    user,
    org,
  },
});
