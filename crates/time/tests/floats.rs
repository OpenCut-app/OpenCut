use time::RationalTime;

#[test]
fn ntsc_period_from_seconds_exact() {
    let t = RationalTime::from_seconds_round(1001.0 / 30000.0, 30000).unwrap();
    assert_eq!(t, RationalTime::new(1001, 30000).unwrap());
}

#[test]
fn film_period_from_seconds_exact() {
    let t = RationalTime::from_seconds_round(1001.0 / 24000.0, 24000).unwrap();
    assert_eq!(t, RationalTime::new(1001, 24000).unwrap());
}

#[test]
fn to_seconds_within_tolerance() {
    let t = RationalTime::new(30000, 1001).unwrap();
    let seconds = t.to_seconds();
    assert!((seconds - 29.97002997002997).abs() < 1e-12);
}

#[test]
fn from_seconds_floor_ceil_round() {
    let max_d = 1000;
    assert_eq!(
        RationalTime::from_seconds_floor(0.3334, max_d).unwrap(),
        RationalTime::new(333, 1000).unwrap()
    );
    assert_eq!(
        RationalTime::from_seconds_ceil(0.3334, max_d).unwrap(),
        RationalTime::new(334, 1000).unwrap()
    );
    assert_eq!(
        RationalTime::from_seconds_round(0.3335, max_d).unwrap(),
        RationalTime::new(334, 1000).unwrap()
    );
}
