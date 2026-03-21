"""add google_event_id with unique constraint to events table

Revision ID: 8d1f2c3e4a5b
Revises: a789b098de90
Create Date: 2025-03-21 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8d1f2c3e4a5b'
down_revision = 'a789b098de90'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add google_event_id column (nullable for non-Google events)
    op.add_column('events', sa.Column('google_event_id', sa.String(), nullable=True))
    op.create_index('ix_events_google_event_id', 'events', ['google_event_id'], unique=False)
    
    # Add unique constraint on (user_id, google_event_id, source)
    op.create_unique_constraint(
        'uq_user_google_event_source',
        'events',
        ['user_id', 'google_event_id', 'source']
    )


def downgrade() -> None:
    # Drop unique constraint
    op.drop_constraint('uq_user_google_event_source', 'events', type_='unique')
    
    # Drop index and column
    op.drop_index('ix_events_google_event_id', 'events')
    op.drop_column('events', 'google_event_id')
