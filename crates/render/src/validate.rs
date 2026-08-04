use std::collections::HashSet;

use decode::SourceStream;

use crate::plan::{Affine, Crop, PlanError, RenderError, RenderPlan};
use crate::source::SourceRegistry;

pub fn validate_plan(plan: &RenderPlan, registry: &SourceRegistry) -> Result<(), RenderError> {
    validate_topology(plan)?;

    for node in &plan.nodes {
        if !registry.contains(node.source.source) {
            return Err(RenderError::InvalidPlan(PlanError::DanglingSourceRef));
        }

        let streams = registry
            .streams(node.source.source)
            .ok_or(RenderError::InvalidPlan(PlanError::DanglingSourceRef))?;
        let stream = streams
            .iter()
            .find(|s| s.id == node.source.stream)
            .ok_or(RenderError::InvalidPlan(PlanError::DanglingSourceRef))?;

        validate_crop(node.crop, stream)?;
    }

    Ok(())
}

pub(crate) fn validate_for_render(
    plan: &RenderPlan,
    registry: &SourceRegistry,
) -> Result<(), RenderError> {
    validate_topology(plan)?;

    for node in &plan.nodes {
        let streams = registry
            .streams(node.source.source)
            .ok_or(RenderError::UnknownSource)?;
        let stream = streams
            .iter()
            .find(|s| s.id == node.source.stream)
            .ok_or(RenderError::UnknownStream)?;

        validate_crop(node.crop, stream)?;
    }

    Ok(())
}

fn validate_topology(plan: &RenderPlan) -> Result<(), RenderError> {
    if plan.output.width == 0 || plan.output.height == 0 {
        return Err(RenderError::InvalidPlan(PlanError::DimensionZero));
    }

    let mut seen = HashSet::new();
    for node in &plan.nodes {
        if !seen.insert(node.id) {
            return Err(RenderError::InvalidPlan(PlanError::DuplicateNodeId));
        }

        if !affine_is_finite(node.transform) {
            return Err(RenderError::InvalidPlan(PlanError::InvalidAffine));
        }
    }

    Ok(())
}

fn validate_crop(crop: Crop, stream: &SourceStream) -> Result<(), RenderError> {
    let width = stream.width;
    let height = stream.height;

    if crop.w == 0
        || crop.h == 0
        || crop.x.saturating_add(crop.w) > width
        || crop.y.saturating_add(crop.h) > height
    {
        return Err(RenderError::InvalidPlan(PlanError::OutOfRangeCrop));
    }
    Ok(())
}

fn affine_is_finite(affine: Affine) -> bool {
    affine.m.iter().all(|v| v.is_finite())
}

#[cfg(test)]
mod tests {
    use decode::{SourceId, SourceStream, SourceStreamId};
    use time::{FrameRate, RationalTime};

    use super::*;
    use crate::plan::{
        Affine, Blend, Crop, Node, NodeId, Opacity, Output, OutputFormat, RenderPlan, SourceRef,
    };

    fn test_output() -> Output {
        Output {
            width: 4,
            height: 4,
            format: OutputFormat::Rgba8Premultiplied,
        }
    }

    fn registry_with(source: SourceId, streams: Vec<SourceStream>) -> SourceRegistry {
        let mut registry = SourceRegistry::new();
        registry.insert(source, streams);
        registry
    }

    fn sample_stream() -> SourceStream {
        SourceStream {
            id: SourceStreamId::new(1),
            frame_rate: FrameRate::new(30, 1).unwrap(),
            width: 4,
            height: 4,
            duration: RationalTime::new(10, 1).unwrap(),
        }
    }

    #[test]
    fn dangling_source_ref_rejected() {
        let plan = RenderPlan {
            output: test_output(),
            nodes: vec![Node {
                id: NodeId::new(1),
                source: SourceRef {
                    source: SourceId::new(42),
                    stream: SourceStreamId::new(1),
                    time: RationalTime::new(0, 1).unwrap(),
                },
                crop: Crop {
                    x: 0,
                    y: 0,
                    w: 4,
                    h: 4,
                },
                transform: Affine {
                    m: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
                },
                opacity: Opacity::new(1.0).unwrap(),
                blend: Blend::SourceOver,
            }],
        };

        assert_eq!(
            validate_plan(&plan, &SourceRegistry::new()),
            Err(RenderError::InvalidPlan(PlanError::DanglingSourceRef))
        );
    }

    #[test]
    fn duplicate_node_id_rejected() {
        let source = SourceId::new(1);
        let stream = SourceStreamId::new(1);
        let registry = registry_with(source, vec![sample_stream()]);
        let node = Node {
            id: NodeId::new(1),
            source: SourceRef {
                source,
                stream,
                time: RationalTime::new(0, 1).unwrap(),
            },
            crop: Crop {
                x: 0,
                y: 0,
                w: 4,
                h: 4,
            },
            transform: Affine {
                m: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            },
            opacity: Opacity::new(1.0).unwrap(),
            blend: Blend::SourceOver,
        };

        let plan = RenderPlan {
            output: test_output(),
            nodes: vec![node.clone(), node],
        };

        assert_eq!(
            validate_plan(&plan, &registry),
            Err(RenderError::InvalidPlan(PlanError::DuplicateNodeId))
        );
    }

    #[test]
    fn out_of_range_crop_rejected() {
        let source = SourceId::new(1);
        let stream = SourceStreamId::new(1);
        let registry = registry_with(source, vec![sample_stream()]);
        let plan = RenderPlan {
            output: test_output(),
            nodes: vec![Node {
                id: NodeId::new(1),
                source: SourceRef {
                    source,
                    stream,
                    time: RationalTime::new(0, 1).unwrap(),
                },
                crop: Crop {
                    x: 2,
                    y: 2,
                    w: 4,
                    h: 4,
                },
                transform: Affine {
                    m: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
                },
                opacity: Opacity::new(1.0).unwrap(),
                blend: Blend::SourceOver,
            }],
        };

        assert_eq!(
            validate_plan(&plan, &registry),
            Err(RenderError::InvalidPlan(PlanError::OutOfRangeCrop))
        );
    }

    #[test]
    fn non_finite_affine_rejected() {
        let source = SourceId::new(1);
        let stream = SourceStreamId::new(1);
        let registry = registry_with(source, vec![sample_stream()]);

        for bad in [
            [f32::NAN, 0.0, 0.0, 1.0, 0.0, 0.0],
            [1.0, f32::INFINITY, 0.0, 1.0, 0.0, 0.0],
            [1.0, 0.0, 0.0, f32::NEG_INFINITY, 0.0, 0.0],
        ] {
            let plan = RenderPlan {
                output: test_output(),
                nodes: vec![Node {
                    id: NodeId::new(1),
                    source: SourceRef {
                        source,
                        stream,
                        time: RationalTime::new(0, 1).unwrap(),
                    },
                    crop: Crop {
                        x: 0,
                        y: 0,
                        w: 4,
                        h: 4,
                    },
                    transform: Affine { m: bad },
                    opacity: Opacity::new(1.0).unwrap(),
                    blend: Blend::SourceOver,
                }],
            };

            assert_eq!(
                validate_plan(&plan, &registry),
                Err(RenderError::InvalidPlan(PlanError::InvalidAffine))
            );
        }
    }

    #[test]
    fn dimension_zero_rejected() {
        let plan = RenderPlan {
            output: Output {
                width: 0,
                height: 4,
                format: OutputFormat::Rgba8Premultiplied,
            },
            nodes: vec![],
        };

        assert_eq!(
            validate_plan(&plan, &SourceRegistry::new()),
            Err(RenderError::InvalidPlan(PlanError::DimensionZero))
        );
    }

    #[test]
    fn empty_node_list_accepted() {
        let plan = RenderPlan {
            output: test_output(),
            nodes: vec![],
        };

        assert!(validate_plan(&plan, &SourceRegistry::new()).is_ok());
    }
}
