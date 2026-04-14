/** 与数据库表 role.id 一致 */
export const ROLE_IDS = {
    SUPER_ADMIN: 1,
    TEAM_LEADER: 2,
    TEAM_MEMBER: 3,
    UNGROUPED_USER: 4,
};

export const isSuperAdmin = (userOrRole) => {
    const r = typeof userOrRole === 'object' && userOrRole !== null
        ? userOrRole.role
        : userOrRole;
    return Number(r) === ROLE_IDS.SUPER_ADMIN;
};

export const isTeamLeader = (userOrRole) => {
    const r = typeof userOrRole === 'object' && userOrRole !== null
        ? userOrRole.role
        : userOrRole;
    return Number(r) === ROLE_IDS.TEAM_LEADER;
};

export const isTeamMember = (userOrRole) => {
    const r = typeof userOrRole === 'object' && userOrRole !== null
        ? userOrRole.role
        : userOrRole;
    return Number(r) === ROLE_IDS.TEAM_MEMBER;
};
