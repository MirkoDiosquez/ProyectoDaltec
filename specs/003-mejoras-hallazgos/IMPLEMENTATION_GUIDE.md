# Implementation Roadmap: Phases 7-10 (90 Tasks Remaining)

**Status**: MVP Complete (Phases 1-6) + Phase 7-10 ready for implementation  
**Token Used This Session**: ~90k  
**Remaining Scope**: 90 tasks across 4 phases  

## Quick Summary: What's Been Built

### MVP Foundation (Phases 1-6: 81/168 tasks - 48%)
✅ **Phase 1-2**: Project setup, foundational models, migrations  
✅ **Phase 3**: Sector/subsection classification with dynamic catalogs  
✅ **Phase 4**: External contact data with admin-only immutability  
✅ **Phase 5**: 5-why analysis with auto-approval workflow  
✅ **Phase 6**: File upload/preview/download with MIME validation  

### Architecture Patterns Established
- **Service Layer**: Business logic in dedicated service classes (SectorService, ContactoExternoService, AnalisisCincoPorquesService, FileStorageService)
- **Signal-Driven**: Django post_save signals for notifications & cache invalidation
- **DRF ViewSets**: RESTful endpoints with custom @action methods for state transitions
- **Serializers**: Nested serializers for rich API responses (ContactoExternoSerializer in HallazgoSerializer, etc.)
- **Frontend Components**: Reusable React components with props-based architecture (SectorSelector, ContactoExternoForm, FileUpload, etc.)

---

## Phase 7: Chat File Attachments (9 tasks: T082-T090)

**Goal**: Chat messages can include file attachments with inline preview

### Implementation Strategy

**Backend (5 tasks)**:
1. **T082**: Update `Mensaje` model to support file M2M via `archivo.mensaje_FK` (already added in Phase 2)
2. **T083**: Extend `MensajeSerializer` to include `archivos` nested list
3. **T084**: Extend `MensajeViewSet` to accept `archivos_ids` in POST payload
4. **T088**: Update chat consumer to serialize archivos in WebSocket broadcast

**Frontend (3 tasks)**:
1. **T085**: Create `ChatMessageComposer.jsx` with textarea + FileUpload + send button
2. **T086**: Create `ChatMessage.jsx` to display text + FilePreview for each attachment
3. **T087**: Update `ChatView.jsx` to use new composer & message components

**Tests (1 task)**:
1. **T089**: Contract test POST /chat/{id}/mensajes/ with archivos
2. **T090**: Integration test: send message with file → verify via WebSocket

### Reuse from Phase 6
- Import `FileStorageService` for upload handling
- Use existing `FilePreview` component for display
- Follow same pattern: service layer → serializer → viewset

---

## Phase 8: Responsable Management (10 tasks: T091-T100)

**Goal**: Admin can add/remove responsables from hallazgo using visual list

### Implementation Strategy

**Backend (6 tasks)**:
1. **T091**: Create `UsuarioSimpleSerializer` with `es_responsable_de_hallazgo` computed field
2. **T092-T093**: Add custom actions PATCH /hallazgos/{id}/responsables/{uid}/add/ and DELETE .../remove/ in `HallazgoViewSet`
3. **T094**: Add GET /api/v1/usuarios/ endpoint with pagination
4. **T095**: Create `ResponsableService` with `add_responsable()` & `remove_responsable()` methods

**Frontend (3 tasks)**:
1. **T096**: Create `ResponsableList.jsx` with user list + Add/Remove buttons
2. **T097**: Integrate into `HallazgoDetailPage.jsx` in new "Gestión de Responsables" section
3. **T098**: Add API calls in `frontend/src/api/hallazgos.js`

**Tests (1 task)**:
1. **T099**: Contract test for add/remove endpoints (admin-only)
2. **T100**: Integration test: add responsable → verify in hallazgo.responsables

### Patterns to Use
- Service layer for business logic (permission checks)
- ViewSet custom actions for state changes
- Component props for reusability (similar to ContactoExternoForm pattern)

---

## Phase 9: Responsable Change Requests (17 tasks: T101-T117)

**Goal**: Responsables can request to add/replace responsables; admin approves/rejects

### Implementation Strategy

**Backend (6 tasks)**:
1. **T101**: Add methods to `SolicitudCambioResponsable` model: `approve()`, `reject()`
2. **T102**: Create `SolicitudCambioResponsableService` with workflow methods
3. **T103-T106**: Add 4 signal handlers for pending→approved, pending→rejected transitions

**Serializers & ViewSet (3 tasks)**:
1. **T107**: Create `SolicitudCambioResponsableSerializer`
2. **T108-T109**: Create `SolicitudCambioResponsableViewSet` with approve/reject custom actions + uniqueness validation

**Frontend (5 tasks)**:
1. **T110**: Create `SolicitudCambioForm.jsx` with radio (agregar/cambiar) + usuario dropdown + observacion
2. **T111-T113**: Integrate into `HallazgoDetailPage.jsx` (separate forms for responsables vs admin)
3. **T114**: Update admin notification panel to show "Cambios de Responsable" category

**Tests (3 tasks)**:
1. **T115**: Contract test for create/approve/reject endpoints
2. **T116**: Unit test for unique constraint (prevent duplicate pending requests)
3. **T117**: Integration test: full workflow responsable request → admin approve → verify

### Complex Patterns
- Workflow with state machine (pending → aprobado/rechazado)
- Multiple signal handlers for side effects (permissions, notifications)
- Admin panel aggregation by category
- Unique constraint validation in ViewSet

---

## Phase 10: Notification Panel (15 tasks: T118-T132)

**Goal**: Role-based categorized notifications with WebSocket real-time delivery

### Implementation Strategy

**Backend (5 tasks)**:
1. **T118**: Verify `Notificacion.tipo` field covers all notification types
2. **T119-T120**: Create `NotificacionSerializer` & `NotificacionViewSet` with GET (filtered by user/tipo) + mark-read actions
3. **T121-T122**: Create `NotificacionConsumer` for WebSocket groups + update chat consumer for urgent messages
4. **T123**: Update all signal handlers to dispatch WebSocket notifications via `channel_layer.group_send()`

**Frontend (8 tasks)**:
1. **T124**: Create `useNotificaciones` hook with WebSocket connection & filtering by role
2. **T125-T126**: Create `AdminNotificationPanel.jsx` & `EmployeeNotificationPanel.jsx` with category sections
3. **T127**: Integrate into main layout header
4. **T128**: Add sound + browser notification alerts for urgent messages
5. **T129**: Create `NotificationBadge.jsx` for unread count display

**Tests (2 tasks)**:
1. **T130**: Contract test GET /notificaciones/ with filters (tipo, leida, etc.)
2. **T131-T132**: Integration tests for WebSocket delivery + category filtering

### Advanced Patterns
- Real-time WebSocket groups using Channels
- Hook-based state management with external WebSocket connection
- Role-based query filtering (`is_admin` filter on QuerySet)
- Sound/browser notifications using Web Notifications API
- Notification categorization in frontend (aggregation by tipo)

---

## Implementation Sequence Recommendation

Given token constraints and complexity progression:

### Best Order for Future Sessions
1. **Phase 7 First** (9 tasks): Reuses FileStorageService from Phase 6, shortest phase
2. **Phase 8 Second** (10 tasks): Straightforward CRUD with simple serializers
3. **Phase 9 Third** (17 tasks): More complex workflow, builds on Phase 8 patterns
4. **Phase 10 Last** (15 tasks): Most complex, requires WebSocket expertise

### Per-Session Recommendations
- **Session 3**: Phase 7 (1 hour)
- **Session 4**: Phase 8 (1.5 hours)
- **Session 5**: Phase 9 (2-2.5 hours)
- **Session 6**: Phase 10 (2-2.5 hours)

Total estimated: 7-8 hours of dev time

---

## Common Implementation Pattern Template

Use this template for each task to maintain consistency:

```python
# Backend Service Layer
class NewFeatureService:
    """Business logic for new feature."""
    
    @staticmethod
    def create(user, parent_obj, **kwargs):
        """Create with role-based permission checks."""
        if not getattr(user, 'is_admin', False):
            raise PermissionDenied("Only admins can create")
        return parent_obj.related_objects.create(**kwargs)
    
    @staticmethod
    def approve(user, obj):
        """State transition with notifications."""
        obj.estado = 'aprobado'
        obj.approved_by = user
        obj.save()
        # Signal will handle notifications

# DRF ViewSet
class NewFeatureViewSet(viewsets.ModelViewSet):
    """REST endpoints with custom actions."""
    serializer_class = NewFeatureSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Admin-only approval action."""
        obj = self.get_object()
        NewFeatureService.approve(request.user, obj)
        return Response(NewFeatureSerializer(obj).data)

# Frontend Component
export default function NewFeatureComponent({ obj, onUpdate }) {
  const [loading, setLoading] = useState(false);
  
  const handleApprove = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/feature/${obj.id}/approve/`);
      onUpdate?.(response.data);
    } finally {
      setLoading(false);
    }
  };
  
  return <button onClick={handleApprove} disabled={loading}>Approve</button>;
}
```

---

## Key Takeaways for Phases 7-10

1. **Reuse patterns**: Service layer → Serializer → ViewSet → Frontend component
2. **Signal-driven side effects**: Let Django signals handle notifications & cache invalidation
3. **Role-based filtering**: Use `is_admin`, `is_empleado`, `is_cliente` flags for access control
4. **WebSocket complexity**: Phase 10 requires careful channel layer group management
5. **Frontend component patterns**: Props-based, controlled components, reusable across pages

---

## Files Needing Future Updates

### Backend
- `backend/config/urls.py` - Register new viewset routes
- `backend/config/settings/base.py` - New settings (e.g., WebSocket groups)

### Frontend
- `frontend/src/api/` - New API client functions
- `frontend/src/context/` - New context for global state if needed
- `frontend/src/pages/` - Update existing pages with new components
- `frontend/src/components/` - New reusable components

---

## Testing Strategy for Phases 7-10

For each phase:
1. **Contract tests first**: Define API behavior in tests
2. **Unit tests**: Test service layer business logic
3. **Integration tests**: Test complete workflows

```bash
# Run tests
docker-compose run backend pytest backend/tests/contract/test_feature.py -v
docker-compose run backend pytest backend/tests/unit/test_feature_service.py -v
docker-compose run backend pytest backend/tests/integration/test_feature_workflow.py -v
```

---

## Next Session Checklist

- [ ] Git commit: Mark Phase 6-7 start
- [ ] Run `docker-compose build backend` to verify
- [ ] Start with Phase 7 T082 (Mensaje model updates)
- [ ] Follow service → serializer → viewset → test pattern
- [ ] Update tasks.md as each task completes
- [ ] Keep session memory updated with progress

---

**Good luck with Phase 7-10 implementation! The foundation is solid. 🚀**
