"""ViewSet for 5-why analysis (Análisis de los Cinco Porqués) - Phase 5 T056."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404

from apps.hallazgos.models import Hallazgo
from apps.analisis_cinco_porques.models import AnalisisCincoPorques
from apps.analisis_cinco_porques.serializers import (
    AnalisisCincoPorquesSerializer,
    AnalisisCincoPorquesCreateSerializer,
)
from apps.analisis_cinco_porques.services import AnalisisCincoPorquesService


class AnalisisCincoPorquesViewSet(viewsets.ModelViewSet):
    """ViewSet for managing 5-why analysis porqués.
    
    Routes:
    - POST /api/v1/hallazgos/{hallazgo_id}/porques/ - Create porqué
    - GET /api/v1/hallazgos/{hallazgo_id}/porques/ - List porqués
    - GET /api/v1/hallazgos/{hallazgo_id}/porques/{id}/ - Retrieve porqué
    - POST /api/v1/hallazgos/{hallazgo_id}/porques/{id}/approve/ - Approve (admin-only)
    - POST /api/v1/hallazgos/{hallazgo_id}/porques/{id}/reject/ - Reject (admin-only)
    """
    
    queryset = AnalisisCincoPorques.objects.all()
    serializer_class = AnalisisCincoPorquesSerializer
    
    def get_queryset(self):
        """Filter porqués by hallazgo."""
        hallazgo_id = self.kwargs.get('hallazgo_id')
        if hallazgo_id:
            return AnalisisCincoPorques.objects.filter(hallazgo_id=hallazgo_id)
        return AnalisisCincoPorques.objects.none()
    
    def get_hallazgo(self):
        """Get hallazgo from URL kwargs."""
        hallazgo_id = self.kwargs.get('hallazgo_id')
        return get_object_or_404(Hallazgo, pk=hallazgo_id)
    
    def get_serializer_context(self):
        """Add hallazgo and request to serializer context."""
        context = super().get_serializer_context()
        context['hallazgo'] = self.get_hallazgo()
        return context
    
    def create(self, request, *args, **kwargs):
        """Create a new porqué."""
        hallazgo = self.get_hallazgo()
        serializer = AnalisisCincoPorquesCreateSerializer(
            data=request.data,
            context={
                'request': request,
                'hallazgo': hallazgo,
            }
        )
        serializer.is_valid(raise_exception=True)
        porque = serializer.save()
        
        # Return created porqué with detail serializer
        return_serializer = AnalisisCincoPorquesSerializer(porque)
        return Response(return_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, *args, **kwargs):
        """Admin approves a pending porqué.
        
        Admin-only action. Transition pending → aprobado.
        """
        if not getattr(request.user, 'is_admin', False):
            raise PermissionDenied("Only administrators can approve porqués.")
        
        porque = self.get_object()
        
        try:
            porque = AnalisisCincoPorquesService.approve(request.user, porque)
            serializer = self.get_serializer(porque)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, *args, **kwargs):
        """Admin rejects a pending porqué.
        
        Admin-only action. Transition pending → rechazado.
        Request body: {'observacion': 'reason for rejection'}
        """
        if not getattr(request.user, 'is_admin', False):
            raise PermissionDenied("Only administrators can reject porqués.")
        
        porque = self.get_object()
        observacion = request.data.get('observacion', '')
        
        try:
            porque = AnalisisCincoPorquesService.reject(request.user, porque, observacion)
            serializer = self.get_serializer(porque)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
