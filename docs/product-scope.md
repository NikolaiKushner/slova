# Current product scope

Slova is currently a solo-startup product used by one person. A few additional
users may join, but meaningful user or team growth is not expected in the near
term. Engineering decisions should optimize for a small, maintainable product
rather than anticipated scale.

## Deliberately out of scope

The following capabilities and infrastructure are not needed at the current
stage:

- organizations, roles, or role-based access control;
- an administration panel;
- queues or background workers;
- Redis;
- a separate staging environment;
- mandatory pull requests or approval workflows;
- complex monitoring infrastructure;
- self-service billing;
- microservices.

Do not add these preemptively. Reconsider an item only when a concrete product
requirement, operational problem, or sustained increase in users makes its
benefit greater than its maintenance cost.
